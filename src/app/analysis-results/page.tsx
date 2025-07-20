
import dynamic from 'next/dynamic'
import AnalysisResultsLoading from './loading'

const SimpleAnalysisResults = dynamic(
  () => import('@/components/analysis/SimpleAnalysisResults').then(mod => ({ default: mod.SimpleAnalysisResults })),
  {
    loading: () => <AnalysisResultsLoading />,
    ssr: false // Disable SSR as it uses localStorage
  }
)

export default function AnalysisResultsPage() {
  return <SimpleAnalysisResults />
}
