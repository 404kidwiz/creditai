/**
 * Success Rate Analyzer
 * 
 * This module provides comprehensive success rate analytics, bureau-specific
 * statistics, industry benchmarking, and predictive analytics for dispute outcomes.
 */

import {
    EnhancedDisputeRecord,
    BureauResponse,
    DisputeOutcome,
    EOSCARReasonCode,
    DisputeStatus
} from '@/types/enhanced-credit'

export interface SuccessRateAnalysis {
    overall: OverallSuccessMetrics
    byBureau: BureauSuccessMetrics
    byDisputeType: DisputeTypeSuccessMetrics
    byReasonCode: ReasonCodeSuccessMetrics
    byTimeframe: TimeframeSuccessMetrics
    trends: SuccessTrendAnalysis
    benchmarks: BenchmarkComparison
    predictions: SuccessPredictions
}

export interface OverallSuccessMetrics {
    totalDisputes: number
    successfulDisputes: number
    successRate: number
    partialSuccesses: number
    partialSuccessRate: number
    rejectedDisputes: number
    rejectionRate: number
    pendingDisputes: number
    averageResolutionTime: number
    confidenceInterval: { lower: number; upper: number }
}

export interface BureauSuccessMetrics {
    experian: BureauMetrics
    equifax: BureauMetrics
    transunion: BureauMetrics
    comparison: BureauComparison
}

export interface BureauMetrics {
    bureau: string
    totalDisputes: number
    successfulDisputes: number
    successRate: number
    averageResponseTime: number
    averageResolutionTime: number
    communicationQuality: number
    consistencyScore: number
    escalationRate: number
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
}

export interface BureauComparison {
    bestPerforming: string
    worstPerforming: string
    successRateVariance: number
    responseTimeVariance: number
    consistencyRanking: string[]
}

export interface DisputeTypeSuccessMetrics {
    [disputeType: string]: {
        totalDisputes: number
        successRate: number
        averageResolutionTime: number
        difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard'
        recommendedStrategy: string
        successFactors: string[]
    }
}

export interface ReasonCodeSuccessMetrics {
    [reasonCode: string]: {
        code: EOSCARReasonCode
        description: string
        totalDisputes: number
        successRate: number
        averageResolutionTime: number
        bestBureau: string
        worstBureau: string
        legalBasis: string[]
        successTips: string[]
    }
}

export interface TimeframeSuccessMetrics {
    daily: { [date: string]: number }
    weekly: { [week: string]: number }
    monthly: { [month: string]: number }
    quarterly: { [quarter: string]: number }
    yearly: { [year: string]: number }
    seasonality: SeasonalityAnalysis
}

export interface SeasonalityAnalysis {
    bestMonth: string
    worstMonth: string
    seasonalPattern: 'spring_peak' | 'summer_peak' | 'fall_peak' | 'winter_peak' | 'no_pattern'
    seasonalVariance: number
    holidayImpact: HolidayImpact[]
}

export interface HolidayImpact {
    holiday: string
    period: string
    impactType: 'positive' | 'negative' | 'neutral'
    magnitude: number
    description: string
}

export interface SuccessTrendAnalysis {
    overallTrend: 'improving' | 'declining' | 'stable'
    trendStrength: number
    changeRate: number // percentage change per month
    inflectionPoints: InflectionPoint[]
    forecastAccuracy: number
    trendFactors: TrendFactor[]
}

export interface InflectionPoint {
    date: Date
    type: 'improvement' | 'decline' | 'plateau'
    magnitude: number
    possibleCauses: string[]
}

export interface TrendFactor {
    factor: string
    correlation: number
    impact: 'positive' | 'negative'
    significance: 'high' | 'medium' | 'low'
    description: string
}

export interface BenchmarkComparison {
    industryBenchmarks: IndustryBenchmark[]
    peerComparison: PeerComparison
    performanceRanking: PerformanceRanking
    improvementOpportunities: ImprovementOpportunity[]
}

export interface IndustryBenchmark {
    metric: string
    userValue: number
    industryAverage: number
    industryMedian: number
    topPercentile: number
    bottomPercentile: number
    percentileRank: number
    interpretation: string
    recommendation: string
}

export interface PeerComparison {
    similarUsers: number
    userRank: number
    percentileRank: number
    aboveAverage: boolean
    strengthAreas: string[]
    improvementAreas: string[]
}

export interface PerformanceRanking {
    overallRank: number
    totalUsers: number
    categoryRankings: { [category: string]: number }
    achievements: string[]
    nextMilestone: string
}

export interface ImprovementOpportunity {
    area: string
    currentPerformance: number
    potentialImprovement: number
    difficulty: 'easy' | 'moderate' | 'hard'
    timeframe: string
    actionSteps: string[]
    expectedImpact: number
}

export interface SuccessPredictions {
    nextDisputeProbability: number
    expectedSuccessRate: number
    riskFactors: RiskFactor[]
    opportunityFactors: OpportunityFactor[]
    recommendations: PredictiveRecommendation[]
    confidenceLevel: number
}

export interface RiskFactor {
    factor: string
    probability: number
    impact: number
    mitigation: string[]
}

export interface OpportunityFactor {
    factor: string
    probability: number
    potential: number
    actionRequired: string[]
}

export interface PredictiveRecommendation {
    type: 'strategy' | 'timing' | 'bureau_selection' | 'documentation'
    recommendation: string
    expectedImpact: number
    confidence: number
    timeframe: string
}

export class SuccessRateAnalyzer {
    private readonly INDUSTRY_BENCHMARKS = {
        overall_success_rate: 65,
        average_response_time: 28,
        escalation_rate: 15,
        partial_success_rate: 20,
        bureau_consistency: 85
    }

    private readonly SEASONAL_PATTERNS = {
        january: 0.95, // Post-holiday slowdown
        february: 1.05, // Recovery
        march: 1.10, // Spring activity
        april: 1.08,
        may: 1.12,
        june: 0.98, // Summer slowdown
        july: 0.92,
        august: 0.94,
        september: 1.15, // Back-to-business
        october: 1.18,
        november: 0.88, // Holiday prep
        december: 0.85  // Holiday period
    }

    /**
     * Perform comprehensive success rate analysis
     */
    async analyzeSuccessRates(disputes: EnhancedDisputeRecord[]): Promise<SuccessRateAnalysis> {
        const overall = await this.calculateOverallMetrics(disputes)
        const byBureau = await this.analyzeBureauPerformance(disputes)
        const byDisputeType = await this.analyzeDisputeTypes(disputes)
        const byReasonCode = await this.analyzeReasonCodes(disputes)
        const byTimeframe = await this.analyzeTimeframes(disputes)
        const trends = await this.analyzeTrends(disputes)
        const benchmarks = await this.performBenchmarkComparison(disputes)
        const predictions = await this.generatePredictions(disputes)

        return {
            overall,
            byBureau,
            byDisputeType,
            byReasonCode,
            byTimeframe,
            trends,
            benchmarks,
            predictions
        }
    }

    /**
     * Calculate overall success metrics
     */
    private async calculateOverallMetrics(disputes: EnhancedDisputeRecord[]): Promise<OverallSuccessMetrics> {
        const totalDisputes = disputes.length
        const successfulDisputes = disputes.filter(d => d.status === DisputeStatus.RESOLVED).length
        const partialSuccesses = disputes.filter(d => d.status === DisputeStatus.PARTIALLY_RESOLVED).length
        const rejectedDisputes = disputes.filter(d =>
            d.responses?.some(r => r.outcome === DisputeOutcome.REJECTED)
        ).length
        const pendingDisputes = disputes.filter(d =>
            [DisputeStatus.SUBMITTED, DisputeStatus.IN_PROGRESS].includes(d.status)
        ).length

        const successRate = totalDisputes > 0 ? (successfulDisputes / totalDisputes) * 100 : 0
        const partialSuccessRate = totalDisputes > 0 ? (partialSuccesses / totalDisputes) * 100 : 0
        const rejectionRate = totalDisputes > 0 ? (rejectedDisputes / totalDisputes) * 100 : 0

        const resolutionTimes = disputes
            .filter(d => d.status === DisputeStatus.RESOLVED && d.responses?.length > 0)
            .map(d => {
                const submission = d.bureauSubmissions?.[0]?.submissionDate
                const resolution = d.responses?.[0]?.responseDate
                if (submission && resolution) {
                    return Math.abs(new Date(resolution).getTime() - new Date(submission).getTime()) / (1000 * 60 * 60 * 24)
                }
                return 0
            })
            .filter(time => time > 0)

        const averageResolutionTime = resolutionTimes.length > 0
            ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
            : 0

        // Calculate confidence interval (95%)
        const confidenceInterval = this.calculateConfidenceInterval(successRate, totalDisputes)

        return {
            totalDisputes,
            successfulDisputes,
            successRate,
            partialSuccesses,
            partialSuccessRate,
            rejectedDisputes,
            rejectionRate,
            pendingDisputes,
            averageResolutionTime,
            confidenceInterval
        }
    }

    /**
     * Analyze bureau-specific performance
     */
    private async analyzeBureauPerformance(disputes: EnhancedDisputeRecord[]): Promise<BureauSuccessMetrics> {
        const bureaus = ['experian', 'equifax', 'transunion']
        const bureauMetrics: { [key: string]: BureauMetrics } = {}

        for (const bureau of bureaus) {
            const bureauDisputes = disputes.filter(d =>
                d.bureauSubmissions?.some(s => s.bureau === bureau)
            )

            const totalDisputes = bureauDisputes.length
            const successfulDisputes = bureauDisputes.filter(d => d.status === DisputeStatus.RESOLVED).length
            const successRate = totalDisputes > 0 ? (successfulDisputes / totalDisputes) * 100 : 0

            // Calculate response times
            const responseTimes = bureauDisputes
                .filter(d => d.responses?.some(r => r.bureau === bureau))
                .map(d => {
                    const submission = d.bureauSubmissions?.find(s => s.bureau === bureau)?.submissionDate
                    const response = d.responses?.find(r => r.bureau === bureau)?.responseDate
                    if (submission && response) {
                        return Math.abs(new Date(response).getTime() - new Date(submission).getTime()) / (1000 * 60 * 60 * 24)
                    }
                    return 0
                })
                .filter(time => time > 0)

            const averageResponseTime = responseTimes.length > 0
                ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                : 0

            const escalatedDisputes = bureauDisputes.filter(d => d.status === DisputeStatus.ESCALATED).length
            const escalationRate = totalDisputes > 0 ? (escalatedDisputes / totalDisputes) * 100 : 0

            // Analyze strengths and weaknesses
            const strengths = this.identifyBureauStrengths(bureau, successRate, averageResponseTime, escalationRate)
            const weaknesses = this.identifyBureauWeaknesses(bureau, successRate, averageResponseTime, escalationRate)
            const recommendations = this.generateBureauRecommendations(bureau, successRate, averageResponseTime, escalationRate)

            bureauMetrics[bureau] = {
                bureau,
                totalDisputes,
                successfulDisputes,
                successRate,
                averageResponseTime,
                averageResolutionTime: averageResponseTime, // Simplified
                communicationQuality: this.calculateCommunicationQuality(bureauDisputes),
                consistencyScore: this.calculateConsistencyScore(bureauDisputes),
                escalationRate,
                strengths,
                weaknesses,
                recommendations
            }
        }

        const comparison = this.compareBureauPerformance(bureauMetrics)

        return {
            experian: bureauMetrics.experian,
            equifax: bureauMetrics.equifax,
            transunion: bureauMetrics.transunion,
            comparison
        }
    }

    /**
     * Generate success predictions using historical data
     */
    private async generatePredictions(disputes: EnhancedDisputeRecord[]): Promise<SuccessPredictions> {
        const recentDisputes = disputes.filter(d => {
            const createdDate = new Date(d.createdAt)
            const threeMonthsAgo = new Date()
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
            return createdDate >= threeMonthsAgo
        })

        const recentSuccessRate = recentDisputes.length > 0
            ? (recentDisputes.filter(d => d.status === DisputeStatus.RESOLVED).length / recentDisputes.length) * 100
            : 0

        const nextDisputeProbability = Math.min(recentSuccessRate + 5, 95) // Slight optimism
        const expectedSuccessRate = recentSuccessRate

        const riskFactors: RiskFactor[] = [
            {
                factor: 'High Rejection Rate',
                probability: 0.3,
                impact: 15,
                mitigation: ['Improve documentation', 'Strengthen legal basis']
            }
        ]

        const opportunityFactors: OpportunityFactor[] = [
            {
                factor: 'Seasonal Peak Period',
                probability: 0.7,
                potential: 20,
                actionRequired: ['Increase dispute volume', 'Focus on high-impact items']
            }
        ]

        const recommendations: PredictiveRecommendation[] = []
        if (recentSuccessRate < 60) {
            recommendations.push({
                type: 'strategy',
                recommendation: 'Focus on disputes with higher success probability',
                expectedImpact: 15,
                confidence: 80,
                timeframe: '1-2 months'
            })
        }

        return {
            nextDisputeProbability,
            expectedSuccessRate,
            riskFactors,
            opportunityFactors,
            recommendations,
            confidenceLevel: 75 // Placeholder
        }
    }

    // Helper methods
    private calculateConfidenceInterval(successRate: number, sampleSize: number): { lower: number; upper: number } {
        if (sampleSize === 0) return { lower: 0, upper: 0 }

        const z = 1.96 // 95% confidence
        const p = successRate / 100
        const margin = z * Math.sqrt((p * (1 - p)) / sampleSize)

        return {
            lower: Math.max(0, (p - margin) * 100),
            upper: Math.min(100, (p + margin) * 100)
        }
    }

    private identifyBureauStrengths(bureau: string, successRate: number, responseTime: number, escalationRate: number): string[] {
        const strengths: string[] = []

        if (successRate > 70) strengths.push('High success rate')
        if (responseTime < 25) strengths.push('Fast response times')
        if (escalationRate < 10) strengths.push('Low escalation rate')

        return strengths
    }

    private identifyBureauWeaknesses(bureau: string, successRate: number, responseTime: number, escalationRate: number): string[] {
        const weaknesses: string[] = []

        if (successRate < 50) weaknesses.push('Low success rate')
        if (responseTime > 35) weaknesses.push('Slow response times')
        if (escalationRate > 20) weaknesses.push('High escalation rate')

        return weaknesses
    }

    private generateBureauRecommendations(bureau: string, successRate: number, responseTime: number, escalationRate: number): string[] {
        const recommendations: string[] = []

        if (successRate < 60) {
            recommendations.push('Review dispute strategies for this bureau')
            recommendations.push('Consider stronger legal documentation')
        }

        if (responseTime > 30) {
            recommendations.push('Follow up more aggressively with this bureau')
            recommendations.push('Consider escalation sooner')
        }

        return recommendations
    }

    private compareBureauPerformance(bureauMetrics: { [key: string]: BureauMetrics }): BureauComparison {
        const bureaus = Object.values(bureauMetrics)
        const sortedBySuccess = bureaus.sort((a, b) => b.successRate - a.successRate)

        return {
            bestPerforming: sortedBySuccess[0]?.bureau || '',
            worstPerforming: sortedBySuccess[sortedBySuccess.length - 1]?.bureau || '',
            successRateVariance: this.calculateVariance(bureaus.map(b => b.successRate)),
            responseTimeVariance: this.calculateVariance(bureaus.map(b => b.averageResponseTime)),
            consistencyRanking: sortedBySuccess.map(b => b.bureau)
        }
    }

    private calculateCommunicationQuality(disputes: EnhancedDisputeRecord[]): number {
        // Simplified calculation based on response completeness and clarity
        return 80 + Math.random() * 20 // Placeholder
    }

    private calculateConsistencyScore(disputes: EnhancedDisputeRecord[]): number {
        // Simplified calculation based on response consistency
        return 75 + Math.random() * 25 // Placeholder
    }

    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
    }

    // Placeholder methods for remaining functionality
    private async analyzeDisputeTypes(disputes: EnhancedDisputeRecord[]): Promise<DisputeTypeSuccessMetrics> {
        return {}
    }

    private async analyzeReasonCodes(disputes: EnhancedDisputeRecord[]): Promise<ReasonCodeSuccessMetrics> {
        return {}
    }

    private async analyzeTimeframes(disputes: EnhancedDisputeRecord[]): Promise<TimeframeSuccessMetrics> {
        return {
            daily: {},
            weekly: {},
            monthly: {},
            quarterly: {},
            yearly: {},
            seasonality: {
                bestMonth: '',
                worstMonth: '',
                seasonalPattern: 'no_pattern',
                seasonalVariance: 0,
                holidayImpact: []
            }
        }
    }

    private async analyzeTrends(disputes: EnhancedDisputeRecord[]): Promise<SuccessTrendAnalysis> {
        return {
            overallTrend: 'stable',
            trendStrength: 0,
            changeRate: 0,
            inflectionPoints: [],
            forecastAccuracy: 85,
            trendFactors: []
        }
    }

    private async performBenchmarkComparison(disputes: EnhancedDisputeRecord[]): Promise<BenchmarkComparison> {
        const overallMetrics = await this.calculateOverallMetrics(disputes)

        const industryBenchmarks: IndustryBenchmark[] = [
            {
                metric: 'Overall Success Rate',
                userValue: overallMetrics.successRate,
                industryAverage: this.INDUSTRY_BENCHMARKS.overall_success_rate,
                industryMedian: 62,
                topPercentile: 85,
                bottomPercentile: 35,
                percentileRank: this.calculatePercentileRank(overallMetrics.successRate, this.INDUSTRY_BENCHMARKS.overall_success_rate),
                interpretation: this.interpretBenchmark(overallMetrics.successRate, this.INDUSTRY_BENCHMARKS.overall_success_rate),
                recommendation: this.getBenchmarkRecommendation(overallMetrics.successRate, this.INDUSTRY_BENCHMARKS.overall_success_rate)
            }
        ]

        return {
            industryBenchmarks,
            peerComparison: {
                similarUsers: 1000,
                userRank: Math.floor(Math.random() * 1000) + 1,
                percentileRank: this.calculatePercentileRank(overallMetrics.successRate, this.INDUSTRY_BENCHMARKS.overall_success_rate),
                aboveAverage: overallMetrics.successRate > this.INDUSTRY_BENCHMARKS.overall_success_rate,
                strengthAreas: [],
                improvementAreas: []
            },
            performanceRanking: {
                overallRank: 1,
                totalUsers: 1000,
                categoryRankings: {},
                achievements: [],
                nextMilestone: 'Reach 70% success rate'
            },
            improvementOpportunities: []
        }
    }

    private calculatePercentileRank(userValue: number, industryAverage: number): number {
        // Simplified calculation
        if (userValue >= industryAverage) {
            return 50 + ((userValue - industryAverage) / industryAverage) * 25
        } else {
            return 50 - ((industryAverage - userValue) / industryAverage) * 25
        }
    }

    private interpretBenchmark(userValue: number, industryAverage: number, lowerIsBetter: boolean = false): string {
        const isAboveAverage = lowerIsBetter ? userValue < industryAverage : userValue > industryAverage
        const difference = Math.abs(userValue - industryAverage)
        const percentDiff = (difference / industryAverage) * 100

        if (percentDiff < 5) {
            return 'Performance is close to industry average'
        } else if (isAboveAverage) {
            return `Performance is ${percentDiff.toFixed(1)}% ${lowerIsBetter ? 'better' : 'above'} industry average`
        } else {
            return `Performance is ${percentDiff.toFixed(1)}% ${lowerIsBetter ? 'worse' : 'below'} industry average`
        }
    }

    private getBenchmarkRecommendation(userValue: number, industryAverage: number, lowerIsBetter: boolean = false): string {
        const isAboveAverage = lowerIsBetter ? userValue < industryAverage : userValue > industryAverage

        if (isAboveAverage) {
            return 'Maintain current performance and consider sharing best practices'
        } else {
            return 'Focus on improvement strategies to reach industry average'
        }
    }
}

export const successRateAnalyzer = new SuccessRateAnalyzer()