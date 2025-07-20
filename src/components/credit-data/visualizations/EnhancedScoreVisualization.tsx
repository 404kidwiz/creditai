'use client'

import React, { useState } from 'react'
import { BureauScore } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Info,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

interface EnhancedScoreVisualizationProps {
  scores: BureauScore[]
  historicalData?: {
    date: string
    experian?: number
    equifax?: number
    transunion?: number
  }[]
  scoreFactors?: {
    factor: string
    impact: number
    description: string
  }[]
  projectedScore?: number
  onBureauSelect?: (bureau: string) => void
}

export function EnhancedScoreVisualization({ 
  scores, 
  historicalData = [],
  scoreFactors = [],
  projectedScore,
  onBureauSelect 
}: EnhancedScoreVisualizationProps) {
  const [selectedView, setSelectedView] = useState<'current' | 'historical' | 'factors'>('current')
  const [selectedBureau, setSelectedBureau] = useState<string | null>(null)

  const getScoreColor = (score: number): string => {
    if (score >= 800) return '#10B981'
    if (score >= 740) return '#84CC16'
    if (score >= 670) return '#EAB308'
    if (score >= 580) return '#F97316'
    return '#EF4444'
  }

  const getScoreRating = (score: number): string => {
    if (score >= 800) return 'Excellent'
    if (score >= 740) return 'Very Good'
    if (score >= 670) return 'Good'
    if (score >= 580) return 'Fair'
    return 'Poor'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 740) return <Award className="w-5 h-5" />
    if (score >= 670) return <TrendingUp className="w-5 h-5" />
    if (score >= 580) return <Minus className="w-5 h-5" />
    return <AlertTriangle className="w-5 h-5" />
  }

  const averageScore = Math.round(
    scores.reduce((sum, s) => sum + s.score, 0) / scores.length
  )

  const scoreTrend = historicalData.length > 1 
    ? (averageScore - (historicalData[0].experian || 0)) 
    : 0

  // Enhanced Circular Score Display
  const CircularScoreDisplay = ({ score, bureau, isSelected }: { 
    score: number
    bureau: string
    isSelected: boolean 
  }) => {
    const percentage = (score / 850) * 100
    const circumference = 2 * Math.PI * 60
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <motion.div
        className="relative cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setSelectedBureau(bureau)
          onBureauSelect?.(bureau)
        }}
      >
        <svg className="w-40 h-40 transform -rotate-90">
          <defs>
            <linearGradient id={`gradient-${bureau}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={getScoreColor(score)} stopOpacity="0.8" />
              <stop offset="100%" stopColor={getScoreColor(score)} stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="60"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r="60"
            stroke={`url(#gradient-${bureau})`}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
            style={{
              filter: isSelected ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5))' : 'none'
            }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {score}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {bureau}
            </div>
            <div className={`text-xs font-medium mt-1`} style={{ color: getScoreColor(score) }}>
              {getScoreRating(score)}
            </div>
          </motion.div>
        </div>

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}
      </motion.div>
    )
  }

  // Score Factors Radar Chart
  const renderFactorsChart = () => {
    const radarData = scoreFactors.map(factor => ({
      factor: factor.factor,
      impact: Math.abs(factor.impact),
      fullMark: 100
    }))

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="factor" className="text-sm" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar
            name="Impact"
            dataKey="impact"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.6}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    )
  }

  // Historical Trend Chart
  const renderHistoricalChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={historicalData}>
          <defs>
            <linearGradient id="colorExperian" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorEquifax" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorTransUnion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" />
          <YAxis domain={[300, 850]} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="experian"
            stroke="#3B82F6"
            fillOpacity={1}
            fill="url(#colorExperian)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="equifax"
            stroke="#10B981"
            fillOpacity={1}
            fill="url(#colorEquifax)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="transunion"
            stroke="#F59E0B"
            fillOpacity={1}
            fill="url(#colorTransUnion)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Average Score */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white/80">Average Credit Score</h3>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-bold">{averageScore}</span>
                <span className="text-lg text-white/80">{getScoreRating(averageScore)}</span>
              </div>
              {scoreTrend !== 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {scoreTrend > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-300" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-300" />
                  )}
                  <span className="text-sm">
                    {scoreTrend > 0 ? '+' : ''}{scoreTrend} points from last month
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              {getScoreIcon(averageScore)}
              {projectedScore && (
                <div className="mt-2">
                  <p className="text-sm text-white/80">Projected</p>
                  <p className="text-xl font-semibold">{projectedScore}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Selector */}
      <div className="flex gap-2">
        {[
          { id: 'current', label: 'Current Scores', icon: Target },
          { id: 'historical', label: 'Score History', icon: Calendar },
          { id: 'factors', label: 'Score Factors', icon: Info }
        ].map((view) => {
          const Icon = view.icon
          return (
            <Button
              key={view.id}
              variant={selectedView === view.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView(view.id as any)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {view.label}
            </Button>
          )
        })}
      </div>

      {/* Content based on selected view */}
      <AnimatePresence mode="wait">
        {selectedView === 'current' && (
          <motion.div
            key="current"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Credit Scores by Bureau</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-center gap-8 flex-wrap">
                  {scores.map((scoreData) => (
                    <CircularScoreDisplay
                      key={scoreData.bureau}
                      score={scoreData.score}
                      bureau={scoreData.bureau}
                      isSelected={selectedBureau === scoreData.bureau}
                    />
                  ))}
                </div>

                {/* Score Range Guide */}
                <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Credit Score Ranges
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { range: '300-579', label: 'Poor', color: '#EF4444' },
                      { range: '580-669', label: 'Fair', color: '#F97316' },
                      { range: '670-739', label: 'Good', color: '#EAB308' },
                      { range: '740-799', label: 'Very Good', color: '#84CC16' },
                      { range: '800-850', label: 'Excellent', color: '#10B981' }
                    ].map((item) => (
                      <div key={item.range} className="text-center">
                        <div 
                          className="h-2 rounded-full mb-2" 
                          style={{ backgroundColor: item.color }}
                        />
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.range}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedView === 'historical' && (
          <motion.div
            key="historical"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Score History</CardTitle>
              </CardHeader>
              <CardContent>
                {historicalData.length > 0 ? (
                  renderHistoricalChart()
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No historical data available yet
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Check back after your next credit report update
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedView === 'factors' && (
          <motion.div
            key="factors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Score Impact Factors</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreFactors.length > 0 ? (
                  <div className="space-y-6">
                    {renderFactorsChart()}
                    
                    <div className="space-y-3">
                      {scoreFactors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {factor.factor}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {factor.description}
                            </p>
                          </div>
                          <div className={`text-lg font-semibold ${
                            factor.impact > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {factor.impact > 0 ? '+' : ''}{factor.impact}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No score factors data available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips Section */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200">
                Quick Tips to Improve Your Score
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>• Pay all bills on time - payment history is 35% of your score</li>
                <li>• Keep credit utilization below 30% on all cards</li>
                <li>• Don't close old credit cards - length of history matters</li>
                <li>• Limit new credit applications to avoid hard inquiries</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}