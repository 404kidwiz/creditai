'use client';

import React, { useState, useEffect } from 'react';
import { abTestingFramework } from '@/lib/analytics/abTestingFramework';
import { ABTestExperiment, ABTestResults, VariantResults } from '@/types/analytics';

interface ABTestExperimentProps {
  experimentId?: string;
  onExperimentCreate?: (experimentId: string) => void;
}

export function ABTestExperimentComponent({ experimentId, onExperimentCreate }: ABTestExperimentProps) {
  const [experiment, setExperiment] = useState<ABTestExperiment | null>(null);
  const [results, setResults] = useState<ABTestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState(0);
  const [conversions, setConversions] = useState(0);

  useEffect(() => {
    if (experimentId) {
      loadExperiment();
    } else {
      setLoading(false);
    }
  }, [experimentId]);

  const loadExperiment = async () => {
    if (!experimentId) return;

    try {
      setLoading(true);
      setError(null);

      const summary = await abTestingFramework.getExperimentSummary(experimentId);
      if (summary) {
        setExperiment(summary.experiment);
        setResults(summary.results || null);
        setParticipants(summary.participants);
        setConversions(summary.conversions);
      }
    } catch (err) {
      setError('Failed to load experiment');
      console.error('Error loading experiment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExperiment = async () => {
    if (!experiment) return;

    try {
      const success = await abTestingFramework.startExperiment(experiment.id);
      if (success) {
        setExperiment({ ...experiment, status: 'running' });
      }
    } catch (err) {
      console.error('Error starting experiment:', err);
    }
  };

  const handleStopExperiment = async () => {
    if (!experiment) return;

    try {
      const success = await abTestingFramework.stopExperiment(experiment.id);
      if (success) {
        setExperiment({ ...experiment, status: 'completed' });
      }
    } catch (err) {
      console.error('Error stopping experiment:', err);
    }
  };

  const handleCalculateResults = async () => {
    if (!experiment) return;

    try {
      const newResults = await abTestingFramework.calculateResults(experiment.id);
      if (newResults) {
        setResults(newResults);
      }
    } catch (err) {
      console.error('Error calculating results:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatConfidenceInterval = (confidence: any) => {
    if (!confidence) return 'N/A';
    return `${formatPercentage(confidence.lower)} - ${formatPercentage(confidence.upper)}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">No Experiment Selected</h3>
          <p className="text-gray-600">Select an experiment to view details and results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Experiment Header */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{experiment.name}</h1>
            <p className="text-gray-600 mt-1">{experiment.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(experiment.status)}`}>
              {experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1)}
            </span>
            {experiment.status === 'draft' && (
              <button
                onClick={handleStartExperiment}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Experiment
              </button>
            )}
            {experiment.status === 'running' && (
              <button
                onClick={handleStopExperiment}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Stop Experiment
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{participants}</div>
            <div className="text-sm text-gray-600">Participants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{conversions}</div>
            <div className="text-sm text-gray-600">Conversions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {participants > 0 ? formatPercentage(conversions / participants) : '0%'}
            </div>
            <div className="text-sm text-gray-600">Overall Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatPercentage(experiment.trafficAllocation)}
            </div>
            <div className="text-sm text-gray-600">Traffic Allocation</div>
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Variants</h2>
          {experiment.status === 'running' && (
            <button
              onClick={handleCalculateResults}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Calculate Results
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiment.variants.map(variant => {
            const variantResult = results?.variants.find(v => v.variantId === variant.id);
            const isWinner = results?.winningVariant === variant.id;

            return (
              <div
                key={variant.id}
                className={`p-4 border rounded-lg ${
                  isWinner ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{variant.name}</h3>
                  {isWinner && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Winner
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{variant.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Weight:</span>
                    <span>{formatPercentage(variant.weight)}</span>
                  </div>
                  
                  {variantResult && (
                    <>
                      <div className="flex justify-between">
                        <span>Participants:</span>
                        <span>{variantResult.participantCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversions:</span>
                        <span>{variantResult.conversionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversion Rate:</span>
                        <span className="font-medium">
                          {formatPercentage(variantResult.conversionRate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>95% CI:</span>
                        <span>{formatConfidenceInterval(variantResult.confidence)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistical Results */}
      {results && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Statistical Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(results.confidenceLevel)}
              </div>
              <div className="text-sm text-gray-600">Confidence Level</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {results.pValue.toFixed(4)}
              </div>
              <div className="text-sm text-gray-600">P-Value</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {results.effectSize.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Effect Size</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Interpretation</h3>
            <div className="text-sm text-gray-700 space-y-1">
              {results.pValue < 0.05 ? (
                <p className="text-green-700">
                  ✓ The results are statistically significant (p &lt; 0.05)
                </p>
              ) : (
                <p className="text-yellow-700">
                  ⚠ The results are not statistically significant (p ≥ 0.05)
                </p>
              )}
              
              {results.winningVariant ? (
                <p>
                  The winning variant shows a significant improvement in the target metric.
                </p>
              ) : (
                <p>
                  No variant shows a statistically significant improvement over others.
                </p>
              )}
              
              <p>
                Effect size: {results.effectSize < 0.2 ? 'Small' : results.effectSize < 0.5 ? 'Medium' : 'Large'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Experiment Configuration */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Target Metric:</dt>
                <dd className="text-gray-900">{experiment.targetMetric}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Start Date:</dt>
                <dd className="text-gray-900">{experiment.startDate.toLocaleDateString()}</dd>
              </div>
              {experiment.endDate && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">End Date:</dt>
                  <dd className="text-gray-900">{experiment.endDate.toLocaleDateString()}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Traffic Allocation:</dt>
                <dd className="text-gray-900">{formatPercentage(experiment.trafficAllocation)}</dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Segments</h3>
            {experiment.segments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {experiment.segments.map(segment => (
                  <span
                    key={segment}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                  >
                    {segment}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">All users</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}