import { useEffect, useState } from 'react'
import './analysis.css'
import { granulateRequest } from '../../api/granulate'
import { toAnalysisResults } from './transform'


import AnalysisHeader from './components/analysisHeader'
import AnalysisInput from './components/analysisInput'
import RunSettings from './components/runSettings'
import AnalysisOutput from './components/analysisOutput'
import { mockDataBalanced, mockDataDetailed } from './mockData'
import type { Granularity, LoadingStep } from './types'

export default function Analysis() {
  const [inputText, setInputText] = useState('')
  const [granularity, setGranularity] = useState<Granularity>('balanced')
  const [granularityLevel, setGranularityLevel] = useState(3)

  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('extracting')
  const [hasResults, setHasResults] = useState(false)
  const [results, setResults] = useState(mockDataBalanced)
  const [error, setError] = useState('')

const runAnalysis = async () => {
  const text = inputText.trim()
  if (text.length < 20) {
    setError('Please enter at least 20 characters to analyze.')
    return
  }

  setError('')
  setIsLoading(true)
  setHasResults(false)

  try {
    setLoadingStep('extracting')

    await new Promise((r) => setTimeout(r, 200))
    setLoadingStep('building')

    const minSim =
      granularity === 'detailed' ? 0.04 : granularity === 'broad' ? 0.1 : 0.06

    const resp = await granulateRequest(text, minSim)

    setLoadingStep('grouping')
    await new Promise((r) => setTimeout(r, 150))

    const mapped = toAnalysisResults(resp)
    setResults(mapped)
    setHasResults(true)
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Request failed')
  } finally {
    setIsLoading(false)
  }
}



  const reset = () => {
    setInputText('')
    setHasResults(false)
    setGranularity('balanced')
    setGranularityLevel(3)
    setError('')
    setIsLoading(false)
  }

  useEffect(() => {
    if (granularityLevel >= 4) setGranularity('detailed')
    else if (granularityLevel <= 2) setGranularity('broad')
    else setGranularity('balanced')
  }, [granularityLevel])

  return (
    <div className="ap-page">
      <AnalysisHeader isLoading={isLoading} onReset={reset} onRun={runAnalysis} />

      <main className="ap-main">
        <div className="ap-grid">
          <div className="ap-col">
            <AnalysisInput
              inputText={inputText}
              error={error}
              onTextChange={setInputText}
              onClearError={() => setError('')}
            />

            <RunSettings
              granularity={granularity}
              granularityLevel={granularityLevel}
              onGranularityChange={setGranularity}
              onGranularityLevelChange={setGranularityLevel}
            />
          </div>

          <AnalysisOutput
            isLoading={isLoading}
            loadingStep={loadingStep}
            hasResults={hasResults}
            results={results}
          />
        </div>
      </main>
    </div>
  )
}
