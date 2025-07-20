import { supabase } from '@/lib/supabase/client';
import {
  CreditPredictionModel,
  CreditScorePrediction,
  PredictionFactor,
  PredictiveModel,
  ModelFeature,
  ModelPerformance
} from '@/types/analytics';

interface CreditDataPoint {
  userId: string;
  currentScore: number;
  paymentHistory: number; // 0-100
  creditUtilization: number; // 0-100
  lengthOfHistory: number; // months
  creditMix: number; // 1-10
  newCredit: number; // number of recent inquiries
  derogatory: number; // number of negative items
  income?: number;
  debtToIncome?: number;
  timeframe: number; // prediction timeframe in months
}

interface ModelTrainingData {
  features: number[][];
  targets: number[];
  featureNames: string[];
}

export class CreditPredictionEngine {
  private models: Map<string, CreditPredictionModel> = new Map();
  private static instance: CreditPredictionEngine;

  static getInstance(): CreditPredictionEngine {
    if (!CreditPredictionEngine.instance) {
      CreditPredictionEngine.instance = new CreditPredictionEngine();
    }
    return CreditPredictionEngine.instance;
  }

  async initializeModels(): Promise<void> {
    await this.loadModelsFromDatabase();
    
    // If no models exist, create default models
    if (this.models.size === 0) {
      await this.createDefaultModels();
    }
  }

  private async loadModelsFromDatabase(): Promise<void> {
    try {
      const { data: models, error } = await supabase
        .from('credit_prediction_models')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      models?.forEach(model => {
        this.models.set(model.id, {
          id: model.id,
          name: model.name,
          version: model.version,
          algorithm: model.algorithm,
          features: model.features,
          accuracy: model.accuracy,
          lastTrained: new Date(model.last_trained),
          status: model.status
        });
      });
    } catch (error) {
      console.error('Error loading models from database:', error);
    }
  }

  private async createDefaultModels(): Promise<void> {
    const models = [
      {
        name: 'Linear Regression Model',
        algorithm: 'linear_regression' as const,
        features: ['paymentHistory', 'creditUtilization', 'lengthOfHistory', 'creditMix', 'newCredit', 'derogatory']
      },
      {
        name: 'Random Forest Model',
        algorithm: 'random_forest' as const,
        features: ['paymentHistory', 'creditUtilization', 'lengthOfHistory', 'creditMix', 'newCredit', 'derogatory', 'income', 'debtToIncome']
      },
      {
        name: 'Neural Network Model',
        algorithm: 'neural_network' as const,
        features: ['paymentHistory', 'creditUtilization', 'lengthOfHistory', 'creditMix', 'newCredit', 'derogatory', 'income', 'debtToIncome']
      }
    ];

    for (const modelConfig of models) {
      await this.createModel(modelConfig);
    }
  }

  async createModel(config: {
    name: string;
    algorithm: 'linear_regression' | 'random_forest' | 'neural_network' | 'gradient_boosting';
    features: string[];
  }): Promise<string | null> {
    try {
      const modelId = crypto.randomUUID();
      const version = '1.0.0';

      // Train the model with sample data
      const trainingData = await this.getTrainingData();
      const accuracy = await this.trainModel(config.algorithm, trainingData);

      const model: CreditPredictionModel = {
        id: modelId,
        name: config.name,
        version,
        algorithm: config.algorithm,
        features: config.features,
        accuracy,
        lastTrained: new Date(),
        status: 'active'
      };

      // Save to database
      const { error } = await supabase
        .from('credit_prediction_models')
        .insert({
          id: modelId,
          name: model.name,
          version: model.version,
          algorithm: model.algorithm,
          features: model.features,
          accuracy: model.accuracy,
          last_trained: model.lastTrained.toISOString(),
          status: model.status
        });

      if (error) throw error;

      this.models.set(modelId, model);
      return modelId;
    } catch (error) {
      console.error('Error creating model:', error);
      return null;
    }
  }

  async predictCreditScore(
    userId: string,
    currentData: CreditDataPoint,
    timeframe: number = 6
  ): Promise<CreditScorePrediction | null> {
    try {
      // Use the best performing model
      const bestModel = this.getBestModel();
      if (!bestModel) {
        throw new Error('No models available for prediction');
      }

      const prediction = await this.runPrediction(bestModel, currentData, timeframe);
      
      const predictionResult: CreditScorePrediction = {
        userId,
        currentScore: currentData.currentScore,
        predictedScore: prediction.score,
        timeframe,
        confidence: prediction.confidence,
        factors: prediction.factors,
        recommendations: prediction.recommendations,
        modelId: bestModel.id,
        createdAt: new Date()
      };

      // Save prediction to database
      const { error } = await supabase
        .from('credit_score_predictions')
        .insert({
          user_id: userId,
          model_id: bestModel.id,
          current_score: predictionResult.currentScore,
          predicted_score: predictionResult.predictedScore,
          timeframe: predictionResult.timeframe,
          confidence: predictionResult.confidence,
          factors: predictionResult.factors,
          recommendations: predictionResult.recommendations
        });

      if (error) throw error;

      return predictionResult;
    } catch (error) {
      console.error('Error predicting credit score:', error);
      return null;
    }
  }

  private async runPrediction(
    model: CreditPredictionModel,
    data: CreditDataPoint,
    timeframe: number
  ): Promise<{
    score: number;
    confidence: number;
    factors: PredictionFactor[];
    recommendations: string[];
  }> {
    const features = this.extractFeatures(data, model.features);
    
    switch (model.algorithm) {
      case 'linear_regression':
        return this.linearRegressionPredict(features, data, timeframe);
      case 'random_forest':
        return this.randomForestPredict(features, data, timeframe);
      case 'neural_network':
        return this.neuralNetworkPredict(features, data, timeframe);
      case 'gradient_boosting':
        return this.gradientBoostingPredict(features, data, timeframe);
      default:
        throw new Error(`Unsupported algorithm: ${model.algorithm}`);
    }
  }

  private extractFeatures(data: CreditDataPoint, featureNames: string[]): number[] {
    const featureMap: Record<string, number> = {
      paymentHistory: data.paymentHistory,
      creditUtilization: data.creditUtilization,
      lengthOfHistory: data.lengthOfHistory,
      creditMix: data.creditMix,
      newCredit: data.newCredit,
      derogatory: data.derogatory,
      income: data.income || 0,
      debtToIncome: data.debtToIncome || 0,
      currentScore: data.currentScore,
      timeframe: data.timeframe
    };

    return featureNames.map(name => featureMap[name] || 0);
  }

  private async linearRegressionPredict(
    features: number[],
    data: CreditDataPoint,
    timeframe: number
  ): Promise<{
    score: number;
    confidence: number;
    factors: PredictionFactor[];
    recommendations: string[];
  }> {
    // Simplified linear regression model
    const weights = [0.35, -0.30, 0.15, 0.10, -0.20, -0.25, 0.05, -0.10]; // Example weights
    const bias = 50;

    let prediction = bias;
    for (let i = 0; i < Math.min(features.length, weights.length); i++) {
      prediction += features[i] * weights[i];
    }

    // Apply timeframe effect
    const timeframeBoost = Math.min(timeframe * 2, 50);
    prediction += timeframeBoost;

    // Clamp to valid credit score range
    prediction = Math.max(300, Math.min(850, prediction));

    const factors = this.calculateFactors(data, weights.slice(0, features.length));
    const recommendations = this.generateRecommendations(factors);

    return {
      score: Math.round(prediction),
      confidence: 0.75,
      factors,
      recommendations
    };
  }

  private async randomForestPredict(
    features: number[],
    data: CreditDataPoint,
    timeframe: number
  ): Promise<{
    score: number;
    confidence: number;
    factors: PredictionFactor[];
    recommendations: string[];
  }> {
    // Simplified random forest simulation
    const trees = 10;
    const predictions: number[] = [];

    for (let i = 0; i < trees; i++) {
      // Each tree with slight variation
      const treeWeights = [0.35, -0.30, 0.15, 0.10, -0.20, -0.25, 0.05, -0.10]
        .map(w => w + (Math.random() - 0.5) * 0.1);
      
      let treePrediction = data.currentScore;
      for (let j = 0; j < Math.min(features.length, treeWeights.length); j++) {
        treePrediction += features[j] * treeWeights[j] * 0.5;
      }
      
      treePrediction += timeframe * 1.5;
      predictions.push(Math.max(300, Math.min(850, treePrediction)));
    }

    const avgPrediction = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
    const variance = predictions.reduce((sum, p) => sum + Math.pow(p - avgPrediction, 2), 0) / predictions.length;
    const confidence = Math.max(0.5, 1 - (variance / 10000));

    const factors = this.calculateFactors(data, [0.35, -0.30, 0.15, 0.10, -0.20, -0.25, 0.05, -0.10]);
    const recommendations = this.generateRecommendations(factors);

    return {
      score: Math.round(avgPrediction),
      confidence,
      factors,
      recommendations
    };
  }

  private async neuralNetworkPredict(
    features: number[],
    data: CreditDataPoint,
    timeframe: number
  ): Promise<{
    score: number;
    confidence: number;
    factors: PredictionFactor[];
    recommendations: string[];
  }> {
    // Simplified neural network simulation
    // Normalize features
    const normalizedFeatures = features.map(f => f / 100);
    
    // Hidden layer (simplified)
    const hiddenWeights = [
      [0.5, -0.3, 0.2, 0.1, -0.4, -0.2, 0.1, -0.1],
      [0.3, -0.5, 0.4, 0.2, -0.1, -0.3, 0.2, -0.2],
      [0.4, -0.2, 0.3, 0.3, -0.2, -0.4, 0.1, -0.3]
    ];
    
    const hiddenOutputs = hiddenWeights.map(weights => {
      const sum = normalizedFeatures.reduce((acc, feature, i) => 
        acc + feature * (weights[i] || 0), 0);
      return 1 / (1 + Math.exp(-sum)); // Sigmoid activation
    });

    // Output layer
    const outputWeights = [0.6, 0.4, 0.5];
    const outputSum = hiddenOutputs.reduce((acc, output, i) => 
      acc + output * outputWeights[i], 0);
    
    const scaledOutput = outputSum * 300 + data.currentScore + timeframe * 2;
    const prediction = Math.max(300, Math.min(850, scaledOutput));

    const factors = this.calculateFactors(data, [0.40, -0.35, 0.20, 0.15, -0.25, -0.30, 0.10, -0.15]);
    const recommendations = this.generateRecommendations(factors);

    return {
      score: Math.round(prediction),
      confidence: 0.85,
      factors,
      recommendations
    };
  }

  private async gradientBoostingPredict(
    features: number[],
    data: CreditDataPoint,
    timeframe: number
  ): Promise<{
    score: number;
    confidence: number;
    factors: PredictionFactor[];
    recommendations: string[];
  }> {
    // Simplified gradient boosting simulation
    let prediction = data.currentScore;
    const boosts = 5;
    
    for (let i = 0; i < boosts; i++) {
      const boostWeights = [0.07, -0.06, 0.03, 0.02, -0.04, -0.05, 0.01, -0.02];
      let boost = 0;
      
      for (let j = 0; j < Math.min(features.length, boostWeights.length); j++) {
        boost += features[j] * boostWeights[j];
      }
      
      prediction += boost;
    }

    prediction += timeframe * 1.8;
    prediction = Math.max(300, Math.min(850, prediction));

    const factors = this.calculateFactors(data, [0.38, -0.32, 0.18, 0.12, -0.22, -0.28, 0.08, -0.12]);
    const recommendations = this.generateRecommendations(factors);

    return {
      score: Math.round(prediction),
      confidence: 0.90,
      factors,
      recommendations
    };
  }

  private calculateFactors(data: CreditDataPoint, weights: number[]): PredictionFactor[] {
    const factorNames = [
      'Payment History',
      'Credit Utilization',
      'Length of Credit History',
      'Credit Mix',
      'New Credit Inquiries',
      'Derogatory Items',
      'Income Level',
      'Debt-to-Income Ratio'
    ];

    const factorValues = [
      data.paymentHistory,
      data.creditUtilization,
      data.lengthOfHistory,
      data.creditMix,
      data.newCredit,
      data.derogatory,
      data.income || 0,
      data.debtToIncome || 0
    ];

    return factorNames.map((name, index) => ({
      factor: name,
      impact: Math.round((weights[index] || 0) * (factorValues[index] || 0)),
      importance: Math.abs(weights[index] || 0),
      description: this.getFactorDescription(name, factorValues[index] || 0, weights[index] || 0)
    }));
  }

  private getFactorDescription(factor: string, value: number, weight: number): string {
    const impact = weight > 0 ? 'positive' : 'negative';
    const strength = Math.abs(weight) > 0.3 ? 'strong' : Math.abs(weight) > 0.1 ? 'moderate' : 'weak';
    
    return `${factor} has a ${strength} ${impact} impact on your credit score (current value: ${value.toFixed(1)})`;
  }

  private generateRecommendations(factors: PredictionFactor[]): string[] {
    const recommendations: string[] = [];
    
    factors.forEach(factor => {
      if (factor.impact < -10) {
        switch (factor.factor) {
          case 'Payment History':
            recommendations.push('Make all payments on time to improve your payment history');
            break;
          case 'Credit Utilization':
            recommendations.push('Reduce credit card balances to lower utilization below 30%');
            break;
          case 'New Credit Inquiries':
            recommendations.push('Avoid applying for new credit for the next 6-12 months');
            break;
          case 'Derogatory Items':
            recommendations.push('Consider disputing any incorrect negative items on your report');
            break;
          case 'Debt-to-Income Ratio':
            recommendations.push('Work on reducing overall debt to improve debt-to-income ratio');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue maintaining good credit habits');
    }

    return recommendations;
  }

  private getBestModel(): CreditPredictionModel | null {
    let bestModel: CreditPredictionModel | null = null;
    let bestAccuracy = 0;

    for (const model of this.models.values()) {
      if (model.accuracy > bestAccuracy) {
        bestAccuracy = model.accuracy;
        bestModel = model;
      }
    }

    return bestModel;
  }

  private async getTrainingData(): Promise<ModelTrainingData> {
    // In a real implementation, this would fetch actual historical data
    // For now, returning simulated training data
    const features: number[][] = [];
    const targets: number[] = [];
    
    // Generate synthetic training data
    for (let i = 0; i < 1000; i++) {
      const paymentHistory = Math.random() * 100;
      const creditUtilization = Math.random() * 100;
      const lengthOfHistory = Math.random() * 240; // months
      const creditMix = Math.random() * 10;
      const newCredit = Math.random() * 10;
      const derogatory = Math.random() * 5;
      const income = 30000 + Math.random() * 170000;
      const debtToIncome = Math.random() * 50;

      features.push([
        paymentHistory,
        creditUtilization,
        lengthOfHistory,
        creditMix,
        newCredit,
        derogatory,
        income / 1000, // Scale down
        debtToIncome
      ]);

      // Simple target calculation for training
      const target = 300 + 
        (paymentHistory * 3.5) +
        ((100 - creditUtilization) * 3.0) +
        (Math.min(lengthOfHistory, 120) * 1.5) +
        (creditMix * 15) -
        (newCredit * 20) -
        (derogatory * 50) +
        (Math.min(income / 1000, 200) * 0.5) -
        (debtToIncome * 2);

      targets.push(Math.max(300, Math.min(850, target)));
    }

    return {
      features,
      targets,
      featureNames: [
        'paymentHistory',
        'creditUtilization',
        'lengthOfHistory',
        'creditMix',
        'newCredit',
        'derogatory',
        'income',
        'debtToIncome'
      ]
    };
  }

  private async trainModel(
    algorithm: string,
    trainingData: ModelTrainingData
  ): Promise<number> {
    // Simulate model training and return accuracy
    // In a real implementation, this would use actual ML libraries
    const baseAccuracy = 0.75;
    const algorithmBonus = {
      'linear_regression': 0.05,
      'random_forest': 0.10,
      'neural_network': 0.15,
      'gradient_boosting': 0.18
    }[algorithm] || 0;

    return Math.min(0.95, baseAccuracy + algorithmBonus + Math.random() * 0.05);
  }

  async retrainModel(modelId: string): Promise<boolean> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      const trainingData = await this.getTrainingData();
      const newAccuracy = await this.trainModel(model.algorithm, trainingData);

      model.accuracy = newAccuracy;
      model.lastTrained = new Date();

      // Update in database
      const { error } = await supabase
        .from('credit_prediction_models')
        .update({
          accuracy: newAccuracy,
          last_trained: model.lastTrained.toISOString()
        })
        .eq('id', modelId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error retraining model:', error);
      return false;
    }
  }

  async getModelPerformance(modelId: string): Promise<ModelPerformance | null> {
    try {
      const model = this.models.get(modelId);
      if (!model) return null;

      // Calculate performance metrics
      return {
        accuracy: model.accuracy,
        precision: model.accuracy * 0.95,
        recall: model.accuracy * 0.92,
        f1Score: model.accuracy * 0.93,
        mse: (1 - model.accuracy) * 1000,
        rmse: Math.sqrt((1 - model.accuracy) * 1000),
        r2Score: model.accuracy * 0.9
      };
    } catch (error) {
      console.error('Error getting model performance:', error);
      return null;
    }
  }
}

export const creditPredictionEngine = CreditPredictionEngine.getInstance();