'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  creditScoreTracker, 
  CreditScore, 
  ScoreTrend, 
  ScoreGoal, 
  ScoreAlert 
} from '@/lib/scoring/creditScoreTracker'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Bell,
  Calendar,
  BarChart3,
  Plus,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export function CreditScoreTracker() {
  const { user } = useAuth()
  const [scores, setScores] = useState<CreditScore[]>([])
  const [trends, setTrends] = useState<ScoreTrend[]>([])
  const [goals, setGoals] = useState<ScoreGoal[]>([])
  const [alerts, setAlerts] = useState<ScoreAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddScore, setShowAddScore] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [selectedBureau, setSelectedBureau] = useState<'all' | 'experian' | 'equifax' | 'transunion'>('all')

  const [newScore, setNewScore] = useState({
    score: '',
    bureau: 'experian' as 'experian' | 'equifax' | 'transunion',
    scoreType: 'fico' as 'fico' | 'vantage',
    reportDate: new Date().toISOString().split('T')[0]
  })

  const [newGoal, setNewGoal] = useState({
    targetScore: '',
    targetDate: '',
    strategies: ['']
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, selectedBureau])

  const loadData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const [scoresData, trendsData, goalsData, alertsData] = await Promise.all([
        creditScoreTracker.getCreditScoreHistory(
          user.id, 
          12, 
          selectedBureau === 'all' ? undefined : selectedBureau
        ),
        creditScoreTracker.getScoreTrends(
          user.id, 
          ['1M', '3M', '6M', '1Y'],
          selectedBureau === 'all' ? undefined : selectedBureau
        ),
        creditScoreTracker.getScoreGoals(user.id),
        creditScoreTracker.getAlerts(user.id, false, 10)
      ])

      setScores(scoresData)
      setTrends(trendsData)
      setGoals(goalsData)
      setAlerts(alertsData)
    } catch (error) {
      console.error('Error loading score data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddScore = async () => {
    if (!user || !newScore.score) return

    try {
      await creditScoreTracker.addCreditScore(user.id, {
        score: parseInt(newScore.score),
        bureau: newScore.bureau,
        scoreType: newScore.scoreType,
        scoreRange: { min: 300, max: 850 },
        reportDate: new Date(newScore.reportDate),
        factors: [],
        accounts: [],
        utilization: { overall: 0, perCard: [], recommendedUtilization: 30 }
      })

      setNewScore({
        score: '',
        bureau: 'experian',
        scoreType: 'fico',
        reportDate: new Date().toISOString().split('T')[0]
      })
      setShowAddScore(false)
      loadData()
    } catch (error) {
      console.error('Error adding score:', error)
    }
  }

  const handleAddGoal = async () => {
    if (!user || !newGoal.targetScore || !newGoal.targetDate) return

    try {
      await creditScoreTracker.setScoreGoal(
        user.id,
        parseInt(newGoal.targetScore),
        new Date(newGoal.targetDate),
        newGoal.strategies.filter(s => s.trim())
      )

      setNewGoal({
        targetScore: '',
        targetDate: '',
        strategies: ['']
      })
      setShowAddGoal(false)
      loadData()
    } catch (error) {
      console.error('Error adding goal:', error)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-600'
    if (score >= 700) return 'text-blue-600'
    if (score >= 650) return 'text-yellow-600'
    if (score >= 600) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreGrade = (score: number) => {
    if (score >= 750) return 'Excellent'
    if (score >= 700) return 'Good'
    if (score >= 650) return 'Fair'
    if (score >= 600) return 'Poor'
    return 'Very Poor'
  }

  const latestScore = scores[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Credit Score Tracking</h2>
          <p className="text-gray-600">Monitor your credit score progress over time</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowAddScore(true)}
            variant="outline"
            className="inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Score
          </Button>
          <Button
            onClick={() => setShowAddGoal(true)}
            className="inline-flex items-center"
          >
            <Target className="w-4 h-4 mr-2" />
            Set Goal
          </Button>
        </div>
      </div>

      {/* Bureau Filter */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Label className="text-sm font-medium">Filter by Bureau:</Label>
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value as any)}
            className="border rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Bureaus</option>
            <option value="experian">Experian</option>
            <option value="equifax">Equifax</option>
            <option value="transunion">TransUnion</option>
          </select>
        </div>
      </Card>

      {/* Current Score Display */}
      {latestScore && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Current Credit Score</h3>
              <div className="flex items-center space-x-4">
                <span className={`text-4xl font-bold ${getScoreColor(latestScore.score)}`}>
                  {latestScore.score}
                </span>
                <div>
                  <p className="text-sm text-gray-600">{latestScore.bureau.toUpperCase()}</p>
                  <p className="text-sm text-gray-600">{getScoreGrade(latestScore.score)}</p>
                  <p className="text-xs text-gray-500">
                    {latestScore.reportDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="w-24 h-24 relative">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${((latestScore.score - 300) / 550) * 251.33} 251.33`}
                    className={getScoreColor(latestScore.score)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {Math.round(((latestScore.score - 300) / 550) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Score Trends */}
      {trends.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Score Trends</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trends.map((trend) => (
              <div key={trend.period} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {trend.change > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : trend.change < 0 ? (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900">{trend.period}</p>
                <p className={`text-lg font-bold ${
                  trend.change > 0 ? 'text-green-600' : 
                  trend.change < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trend.change > 0 ? '+' : ''}{trend.change}
                </p>
                <p className="text-xs text-gray-500">
                  {trend.startScore} → {trend.endScore}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active Goals */}
      {goals.filter(g => g.status === 'active').length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Score Goals</h3>
          <div className="space-y-4">
            {goals.filter(g => g.status === 'active').map((goal) => (
              <div key={goal.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Target: {goal.targetScore} points
                    </h4>
                    <p className="text-sm text-gray-600">
                      Current: {goal.currentScore} | Target Date: {goal.targetDate.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    {Math.round(goal.progress)}% Complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                {goal.strategies.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Strategies:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {goal.strategies.map((strategy, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 p-4 ${
                  alert.severity === 'success' ? 'border-green-500 bg-green-50' :
                  alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  alert.severity === 'error' ? 'border-red-500 bg-red-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start">
                  <Bell className={`w-5 h-5 mt-0.5 mr-3 ${
                    alert.severity === 'success' ? 'text-green-600' :
                    alert.severity === 'warning' ? 'text-yellow-600' :
                    alert.severity === 'error' ? 'text-red-600' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Score Modal */}
      {showAddScore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Credit Score</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="score">Credit Score *</Label>
                <Input
                  id="score"
                  type="number"
                  min="300"
                  max="850"
                  value={newScore.score}
                  onChange={(e) => setNewScore({...newScore, score: e.target.value})}
                  placeholder="750"
                />
              </div>
              <div>
                <Label htmlFor="bureau">Bureau *</Label>
                <select
                  id="bureau"
                  value={newScore.bureau}
                  onChange={(e) => setNewScore({...newScore, bureau: e.target.value as any})}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="experian">Experian</option>
                  <option value="equifax">Equifax</option>
                  <option value="transunion">TransUnion</option>
                </select>
              </div>
              <div>
                <Label htmlFor="scoreType">Score Type</Label>
                <select
                  id="scoreType"
                  value={newScore.scoreType}
                  onChange={(e) => setNewScore({...newScore, scoreType: e.target.value as any})}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="fico">FICO</option>
                  <option value="vantage">VantageScore</option>
                </select>
              </div>
              <div>
                <Label htmlFor="reportDate">Report Date *</Label>
                <Input
                  id="reportDate"
                  type="date"
                  value={newScore.reportDate}
                  onChange={(e) => setNewScore({...newScore, reportDate: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddScore(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddScore}>
                Add Score
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Set Score Goal</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="targetScore">Target Score *</Label>
                <Input
                  id="targetScore"
                  type="number"
                  min="300"
                  max="850"
                  value={newGoal.targetScore}
                  onChange={(e) => setNewGoal({...newGoal, targetScore: e.target.value})}
                  placeholder="750"
                />
              </div>
              <div>
                <Label htmlFor="targetDate">Target Date *</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                />
              </div>
              <div>
                <Label>Strategies (optional)</Label>
                {newGoal.strategies.map((strategy, index) => (
                  <Input
                    key={index}
                    value={strategy}
                    onChange={(e) => {
                      const newStrategies = [...newGoal.strategies]
                      newStrategies[index] = e.target.value
                      setNewGoal({...newGoal, strategies: newStrategies})
                    }}
                    placeholder="e.g., Pay down credit cards"
                    className="mt-2"
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewGoal({
                    ...newGoal,
                    strategies: [...newGoal.strategies, '']
                  })}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Strategy
                </Button>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddGoal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddGoal}>
                Set Goal
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {scores.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Credit Scores Yet</h3>
          <p className="text-gray-600 mb-4">
            Start tracking your credit score progress by adding your first score.
          </p>
          <Button onClick={() => setShowAddScore(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Score
          </Button>
        </Card>
      )}
    </div>
  )
}