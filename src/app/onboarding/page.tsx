'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  User, 
  CreditCard, 
  Target,
  Upload,
  FileText,
  Shield,
  Bell
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

interface OnboardingStep {
  id: string
  title: string
  description: string
  component: React.ReactNode
}

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    goals: [] as string[],
    experience: 'beginner' as 'beginner' | 'intermediate' | 'advanced'
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeOnboarding = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Update profile with onboarding data
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Welcome to CreditAI! Your profile has been set up.')
      router.push('/upload')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to complete onboarding')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfileData = (field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const toggleGoal = (goal: string) => {
    setProfileData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }))
  }

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to CreditAI',
      description: 'Let\'s get you started on your credit repair journey',
      component: (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to CreditAI!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We're excited to help you improve your credit score using AI-powered analysis and automated dispute generation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="flex items-start space-x-3">
              <Upload className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Upload Reports</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload credit reports from any major bureau
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">AI Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get instant analysis and dispute recommendations
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Target className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Track Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Monitor your credit score improvements
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Help us personalize your experience',
      component: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profileData.full_name}
                onChange={(e) => updateProfileData('full_name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => updateProfileData('phone', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          <div>
            <Label>Credit Repair Experience</Label>
            <div className="grid grid-cols-1 gap-3 mt-2">
              {[
                { value: 'beginner', label: 'Beginner - New to credit repair', description: 'I\'m just getting started' },
                { value: 'intermediate', label: 'Intermediate - Some experience', description: 'I\'ve done some credit repair before' },
                { value: 'advanced', label: 'Advanced - Experienced user', description: 'I\'m familiar with credit repair processes' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateProfileData('experience', option.value)}
                  className={`p-4 text-left border rounded-lg transition-colors ${
                    profileData.experience === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                    {profileData.experience === option.value && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'goals',
      title: 'Set Your Goals',
      description: 'What do you want to achieve?',
      component: (
        <div className="space-y-6">
          <div>
            <Label>Select Your Credit Repair Goals</Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
              Choose all that apply - we'll customize your experience based on your goals
            </p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'improve_score', label: 'Improve Credit Score', description: 'Raise my credit score by 50+ points' },
                { id: 'remove_negatives', label: 'Remove Negative Items', description: 'Dispute and remove inaccurate negative items' },
                { id: 'buy_home', label: 'Buy a Home', description: 'Prepare for mortgage application' },
                { id: 'get_loan', label: 'Get Better Loans', description: 'Qualify for better interest rates' },
                { id: 'build_credit', label: 'Build Credit History', description: 'Establish or rebuild credit' },
                { id: 'monitor_credit', label: 'Monitor Credit', description: 'Keep track of my credit health' }
              ].map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  className={`p-4 text-left border rounded-lg transition-colors ${
                    profileData.goals.includes(goal.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {goal.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {goal.description}
                      </div>
                    </div>
                    {profileData.goals.includes(goal.id) && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Your data is protected with bank-level security',
      component: (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Bank-Level Security
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your credit reports and personal information are encrypted and stored securely using the same technology as major banks.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">End-to-End Encryption</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All data is encrypted in transit and at rest
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">FCRA Compliant</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We follow all Fair Credit Reporting Act requirements
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Your Data, Your Control</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can delete your data at any time
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">No Data Sharing</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We never sell or share your personal information
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ready',
      title: 'You\'re All Set!',
      description: 'Ready to start your credit repair journey',
      component: (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to CreditAI!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your profile is set up and you're ready to start improving your credit score.
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-left">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Next Steps:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Upload your first credit report
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Review AI analysis and recommendations
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Generate and send dispute letters
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentStepData = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {currentStepData.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {currentStepData.description}
            </p>
          </div>

          <div className="mb-8">
            {currentStepData.component}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isFirstStep}
              className="inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="inline-flex items-center"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
} 