'use client'

import React, { useState, useEffect } from 'react'

export function AnalysisDebugger() {
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [extractedText, setExtractedText] = useState<any>(null)

  useEffect(() => {
    // Load data from localStorage
    const analysis = localStorage.getItem('analysisResult')
    const extracted = localStorage.getItem('extractedCreditData')
    
    if (analysis) {
      setAnalysisResult(JSON.parse(analysis))
    }
    
    if (extracted) {
      setExtractedText(JSON.parse(extracted))
    }
  }, [])

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>Analysis Debugger</h1>
      
      <h2>Analysis Result from localStorage:</h2>
      <pre style={{ 
        backgroundColor: '#fff', 
        padding: '10px', 
        border: '1px solid #ccc',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        {analysisResult ? JSON.stringify(analysisResult, null, 2) : 'No analysis result found'}
      </pre>

      <h2>Extracted Text from localStorage:</h2>
      <pre style={{ 
        backgroundColor: '#fff', 
        padding: '10px', 
        border: '1px solid #ccc',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        {extractedText ? JSON.stringify(extractedText, null, 2) : 'No extracted text found'}
      </pre>

      <h2>Debug Analysis:</h2>
      <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        {analysisResult && (
          <div>
            <p><strong>Confidence:</strong> {analysisResult.confidence}%</p>
            <p><strong>Processing Method:</strong> {analysisResult.processingMethod}</p>
            <p><strong>Summary:</strong> {analysisResult.summary}</p>
            <p><strong>Accounts Found:</strong> {analysisResult.extractedData?.accounts?.length || 0}</p>
            <p><strong>Credit Scores:</strong> {JSON.stringify(analysisResult.extractedData?.creditScores || {})}</p>
            <p><strong>Has AI Analysis:</strong> {analysisResult.aiAnalysis ? 'Yes' : 'No'}</p>
          </div>
        )}
      </div>

      {extractedText?.text && (
        <>
          <h2>Raw Extracted Text (First 2000 characters):</h2>
          <pre style={{ 
            backgroundColor: '#fff', 
            padding: '10px', 
            border: '1px solid #ccc',
            maxHeight: '300px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {extractedText.text.substring(0, 2000)}
            {extractedText.text.length > 2000 ? '\n\n... (truncated)' : ''}
          </pre>
        </>
      )}
    </div>
  )
}