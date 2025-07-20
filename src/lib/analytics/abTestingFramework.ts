import { supabase } from '@/lib/supabase/client';
import {
  ABTestExperiment,
  ABTestVariant,
  ABTestResults,
  VariantResults,
  ConfidenceInterval
} from '@/types/analytics';

export class ABTestingFramework {
  private static instance: ABTestingFramework;
  private activeExperiments: Map<string, ABTestExperiment> = new Map();
  private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> experimentId -> variantId

  static getInstance(): ABTestingFramework {
    if (!ABTestingFramework.instance) {
      ABTestingFramework.instance = new ABTestingFramework();
    }
    return ABTestingFramework.instance;
  }

  async initializeFramework(): Promise<void> {
    await this.loadActiveExperiments();
    await this.loadUserAssignments();
  }

  private async loadActiveExperiments(): Promise<void> {
    try {
      const { data: experiments, error } = await supabase
        .from('ab_test_experiments')
        .select('*, ab_test_variants(*)')
        .eq('status', 'running');

      if (error) throw error;

      experiments?.forEach(exp => {
        const experiment: ABTestExperiment = {
          id: exp.id,
          name: exp.name,
          description: exp.description,
          status: exp.status,
          startDate: new Date(exp.start_date),
          endDate: exp.end_date ? new Date(exp.end_date) : undefined,
          variants: exp.ab_test_variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            description: v.description,
            weight: v.weight,
            config: v.config
          })),
          targetMetric: exp.target_metric,
          segments: exp.segments,
          trafficAllocation: exp.traffic_allocation,
          statisticalSignificance: exp.statistical_significance,
          results: exp.results
        };

        this.activeExperiments.set(exp.id, experiment);
      });
    } catch (error) {
      console.error('Error loading active experiments:', error);
    }
  }

  private async loadUserAssignments(): Promise<void> {
    try {
      const { data: assignments, error } = await supabase
        .from('ab_test_assignments')
        .select('*')
        .in('experiment_id', Array.from(this.activeExperiments.keys()));

      if (error) throw error;

      assignments?.forEach(assignment => {
        if (!this.userAssignments.has(assignment.user_id)) {
          this.userAssignments.set(assignment.user_id, new Map());
        }
        this.userAssignments.get(assignment.user_id)!.set(
          assignment.experiment_id,
          assignment.variant_id
        );
      });
    } catch (error) {
      console.error('Error loading user assignments:', error);
    }
  }

  async createExperiment(experiment: Omit<ABTestExperiment, 'id' | 'results'>): Promise<string | null> {
    try {
      const experimentId = crypto.randomUUID();

      // Validate variant weights sum to 1
      const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.001) {
        throw new Error('Variant weights must sum to 1.0');
      }

      // Create experiment
      const { error: expError } = await supabase
        .from('ab_test_experiments')
        .insert({
          id: experimentId,
          name: experiment.name,
          description: experiment.description,
          status: experiment.status,
          start_date: experiment.startDate.toISOString(),
          end_date: experiment.endDate?.toISOString(),
          target_metric: experiment.targetMetric,
          segments: experiment.segments,
          traffic_allocation: experiment.trafficAllocation
        });

      if (expError) throw expError;

      // Create variants
      const variantInserts = experiment.variants.map(variant => ({
        id: variant.id || crypto.randomUUID(),
        experiment_id: experimentId,
        name: variant.name,
        description: variant.description,
        weight: variant.weight,
        config: variant.config
      }));

      const { error: variantError } = await supabase
        .from('ab_test_variants')
        .insert(variantInserts);

      if (variantError) throw variantError;

      // Add to active experiments if running
      if (experiment.status === 'running') {
        this.activeExperiments.set(experimentId, {
          id: experimentId,
          ...experiment,
          variants: variantInserts.map(v => ({
            id: v.id,
            name: v.name,
            description: v.description,
            weight: v.weight,
            config: v.config
          }))
        });
      }

      return experimentId;
    } catch (error) {
      console.error('Error creating experiment:', error);
      return null;
    }
  }

  async startExperiment(experimentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ab_test_experiments')
        .update({
          status: 'running',
          start_date: new Date().toISOString()
        })
        .eq('id', experimentId);

      if (error) throw error;

      await this.loadActiveExperiments();
      return true;
    } catch (error) {
      console.error('Error starting experiment:', error);
      return false;
    }
  }

  async stopExperiment(experimentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ab_test_experiments')
        .update({
          status: 'completed',
          end_date: new Date().toISOString()
        })
        .eq('id', experimentId);

      if (error) throw error;

      this.activeExperiments.delete(experimentId);
      return true;
    } catch (error) {
      console.error('Error stopping experiment:', error);
      return false;
    }
  }

  async assignUserToExperiment(userId: string, experimentId: string): Promise<string | null> {
    try {
      const experiment = this.activeExperiments.get(experimentId);
      if (!experiment) {
        return null;
      }

      // Check if user is already assigned
      const userExperiments = this.userAssignments.get(userId);
      if (userExperiments?.has(experimentId)) {
        return userExperiments.get(experimentId)!;
      }

      // Check traffic allocation
      if (Math.random() > experiment.trafficAllocation) {
        return null; // User not included in experiment
      }

      // Assign to variant based on weights
      const variantId = this.selectVariantByWeight(experiment.variants);
      
      // Save assignment to database
      const { error } = await supabase
        .from('ab_test_assignments')
        .insert({
          experiment_id: experimentId,
          variant_id: variantId,
          user_id: userId,
          assigned_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local cache
      if (!this.userAssignments.has(userId)) {
        this.userAssignments.set(userId, new Map());
      }
      this.userAssignments.get(userId)!.set(experimentId, variantId);

      return variantId;
    } catch (error) {
      console.error('Error assigning user to experiment:', error);
      return null;
    }
  }

  private selectVariantByWeight(variants: ABTestVariant[]): string {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant.id;
      }
    }

    // Fallback to first variant
    return variants[0].id;
  }

  async getVariantForUser(userId: string, experimentName: string): Promise<ABTestVariant | null> {
    const experiment = Array.from(this.activeExperiments.values())
      .find(exp => exp.name === experimentName);

    if (!experiment) {
      return null;
    }

    // Check if user is already assigned
    const userExperiments = this.userAssignments.get(userId);
    let variantId = userExperiments?.get(experiment.id);

    // If not assigned, assign now
    if (!variantId) {
      variantId = await this.assignUserToExperiment(userId, experiment.id);
    }

    if (!variantId) {
      return null; // User not in experiment
    }

    return experiment.variants.find(v => v.id === variantId) || null;
  }

  async trackConversion(userId: string, experimentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ab_test_assignments')
        .update({
          converted: true,
          conversion_date: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('experiment_id', experimentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error tracking conversion:', error);
      return false;
    }
  }

  async calculateResults(experimentId: string): Promise<ABTestResults | null> {
    try {
      const { data: assignments, error } = await supabase
        .from('ab_test_assignments')
        .select('*')
        .eq('experiment_id', experimentId);

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        return null;
      }

      const experiment = this.activeExperiments.get(experimentId);
      if (!experiment) {
        return null;
      }

      const variantResults: VariantResults[] = [];
      let totalParticipants = 0;
      let totalConversions = 0;

      // Calculate results for each variant
      for (const variant of experiment.variants) {
        const variantAssignments = assignments.filter(a => a.variant_id === variant.id);
        const participantCount = variantAssignments.length;
        const conversionCount = variantAssignments.filter(a => a.converted).length;
        const conversionRate = participantCount > 0 ? conversionCount / participantCount : 0;

        // Calculate confidence interval for conversion rate
        const confidence = this.calculateConfidenceInterval(conversionCount, participantCount, 0.95);

        variantResults.push({
          variantId: variant.id,
          participantCount,
          conversionCount,
          conversionRate,
          confidence
        });

        totalParticipants += participantCount;
        totalConversions += conversionCount;
      }

      // Determine statistical significance
      const { pValue, winningVariant } = this.calculateStatisticalSignificance(variantResults);
      const confidenceLevel = 1 - pValue;
      
      // Calculate effect size (Cohen's h for proportions)
      const effectSize = this.calculateEffectSize(variantResults);

      const results: ABTestResults = {
        experimentId,
        variants: variantResults,
        winningVariant,
        confidenceLevel,
        pValue,
        effectSize,
        sampleSize: totalParticipants
      };

      // Update experiment with results
      await supabase
        .from('ab_test_experiments')
        .update({
          results,
          statistical_significance: confidenceLevel
        })
        .eq('id', experimentId);

      return results;
    } catch (error) {
      console.error('Error calculating results:', error);
      return null;
    }
  }

  private calculateConfidenceInterval(
    successes: number,
    trials: number,
    confidenceLevel: number
  ): ConfidenceInterval {
    if (trials === 0) {
      return { lower: 0, upper: 0, level: confidenceLevel };
    }

    const p = successes / trials;
    const z = this.getZScore(confidenceLevel);
    const margin = z * Math.sqrt((p * (1 - p)) / trials);

    return {
      lower: Math.max(0, p - margin),
      upper: Math.min(1, p + margin),
      level: confidenceLevel
    };
  }

  private getZScore(confidenceLevel: number): number {
    // Z-scores for common confidence levels
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };

    return zScores[confidenceLevel] || 1.96;
  }

  private calculateStatisticalSignificance(variants: VariantResults[]): {
    pValue: number;
    winningVariant?: string;
  } {
    if (variants.length < 2) {
      return { pValue: 1.0 };
    }

    // Sort variants by conversion rate
    const sortedVariants = [...variants].sort((a, b) => b.conversionRate - a.conversionRate);
    const control = sortedVariants[1]; // Second best as control
    const treatment = sortedVariants[0]; // Best as treatment

    // Two-proportion z-test
    const p1 = treatment.conversionRate;
    const n1 = treatment.participantCount;
    const p2 = control.conversionRate;
    const n2 = control.participantCount;

    if (n1 === 0 || n2 === 0) {
      return { pValue: 1.0 };
    }

    const pooledP = (treatment.conversionCount + control.conversionCount) / (n1 + n2);
    const pooledSE = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

    if (pooledSE === 0) {
      return { pValue: 1.0 };
    }

    const zScore = (p1 - p2) / pooledSE;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    return {
      pValue,
      winningVariant: pValue < 0.05 ? treatment.variantId : undefined
    };
  }

  private normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateEffectSize(variants: VariantResults[]): number {
    if (variants.length < 2) {
      return 0;
    }

    const sortedVariants = [...variants].sort((a, b) => b.conversionRate - a.conversionRate);
    const p1 = sortedVariants[0].conversionRate;
    const p2 = sortedVariants[1].conversionRate;

    // Cohen's h for proportions
    const h = 2 * (Math.asin(Math.sqrt(p1)) - Math.asin(Math.sqrt(p2)));
    return Math.abs(h);
  }

  async getExperimentSummary(experimentId: string): Promise<{
    experiment: ABTestExperiment;
    results?: ABTestResults;
    participants: number;
    conversions: number;
  } | null> {
    try {
      const { data: expData, error: expError } = await supabase
        .from('ab_test_experiments')
        .select('*, ab_test_variants(*)')
        .eq('id', experimentId)
        .single();

      if (expError) throw expError;

      const { data: assignments, error: assignError } = await supabase
        .from('ab_test_assignments')
        .select('*')
        .eq('experiment_id', experimentId);

      if (assignError) throw assignError;

      const experiment: ABTestExperiment = {
        id: expData.id,
        name: expData.name,
        description: expData.description,
        status: expData.status,
        startDate: new Date(expData.start_date),
        endDate: expData.end_date ? new Date(expData.end_date) : undefined,
        variants: expData.ab_test_variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          weight: v.weight,
          config: v.config
        })),
        targetMetric: expData.target_metric,
        segments: expData.segments,
        trafficAllocation: expData.traffic_allocation,
        statisticalSignificance: expData.statistical_significance,
        results: expData.results
      };

      const participants = assignments?.length || 0;
      const conversions = assignments?.filter(a => a.converted).length || 0;
      const results = experiment.results || await this.calculateResults(experimentId);

      return {
        experiment,
        results: results || undefined,
        participants,
        conversions
      };
    } catch (error) {
      console.error('Error getting experiment summary:', error);
      return null;
    }
  }

  async getAllExperiments(): Promise<ABTestExperiment[]> {
    try {
      const { data, error } = await supabase
        .from('ab_test_experiments')
        .select('*, ab_test_variants(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(exp => ({
        id: exp.id,
        name: exp.name,
        description: exp.description,
        status: exp.status,
        startDate: new Date(exp.start_date),
        endDate: exp.end_date ? new Date(exp.end_date) : undefined,
        variants: exp.ab_test_variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          weight: v.weight,
          config: v.config
        })),
        targetMetric: exp.target_metric,
        segments: exp.segments,
        trafficAllocation: exp.traffic_allocation,
        statisticalSignificance: exp.statistical_significance,
        results: exp.results
      })) || [];
    } catch (error) {
      console.error('Error getting all experiments:', error);
      return [];
    }
  }

  // Helper method for feature flags
  async isFeatureEnabled(userId: string, featureName: string): Promise<boolean> {
    const variant = await this.getVariantForUser(userId, featureName);
    return variant?.config?.enabled === true;
  }

  // Helper method for getting experiment configuration
  async getExperimentConfig(userId: string, experimentName: string): Promise<any> {
    const variant = await this.getVariantForUser(userId, experimentName);
    return variant?.config || {};
  }
}

export const abTestingFramework = ABTestingFramework.getInstance();