'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  BarChart3, 
  Target, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { slideInFromRight, slideInFromLeft, fadeIn } from '@/lib/animations/variants';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ isOpen, onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to CreditAI',
      description: 'Your AI-powered credit repair assistant is here to help you improve your credit score.',
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <p className="text-lg text-muted-foreground">
            We'll guide you through the process of analyzing your credit report and creating a personalized improvement plan.
          </p>
        </div>
      ),
    },
    {
      id: 'upload',
      title: 'Upload Your Credit Report',
      description: 'Start by uploading your credit report from any major bureau.',
      icon: <Upload className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Experian</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Equifax</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">TransUnion</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Our AI will securely analyze your report to identify opportunities for improvement.
          </p>
        </div>
      ),
      action: {
        label: 'Try Upload Demo',
        onClick: () => {
          // Demo action
          console.log('Demo upload triggered');
        },
      },
    },
    {
      id: 'analysis',
      title: 'AI-Powered Analysis',
      description: 'Our advanced AI analyzes your credit report for errors and improvement opportunities.',
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">What our AI finds:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Inaccurate personal information
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Duplicate accounts or entries
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Outdated negative items
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Optimization opportunities
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'disputes',
      title: 'Generate Dispute Letters',
      description: 'Automatically generate professional dispute letters based on our findings.',
      icon: <Target className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <h4 className="font-medium text-primary mb-2">Smart Dispute Strategy</h4>
            <p className="text-sm text-muted-foreground">
              Our AI prioritizes disputes based on potential impact and likelihood of success, 
              creating legally compliant letters that follow FCRA guidelines.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              FCRA Compliant
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Personalized
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Professional Format
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              High Success Rate
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tracking',
      title: 'Track Your Progress',
      description: 'Monitor your credit score improvements and dispute results over time.',
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Real-time Monitoring</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Track your credit score changes and see the impact of your dispute efforts.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Score</span>
                <span className="font-medium">650</span>
              </div>
              <Progress value={65} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Target Score</span>
                <span className="font-medium text-green-600">750+</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setDirection('forward');
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        variants={fadeIn}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full max-w-2xl"
      >
        <Card className="p-0 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {step.icon}
                <div>
                  <h2 className="text-xl font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSkip}
                className="shrink-0"
                aria-label="Skip onboarding"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={direction === 'forward' ? slideInFromRight : slideInFromLeft}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                {step.content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-muted/20">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-2">
                {step.action && (
                  <Button
                    variant="outline"
                    onClick={step.action.onClick}
                  >
                    {step.action.label}
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  className="flex items-center gap-2"
                >
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}