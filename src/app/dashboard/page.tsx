import dynamic from 'next/dynamic'
import DashboardLoading from './loading'

const DashboardContent = dynamic(
  () => import('@/components/dashboard/DashboardContent').then(mod => ({ default: mod.DashboardContent })),
  {
    loading: () => <DashboardLoading />,
    ssr: true // Enable SSR for SEO
  }
)

export default function DashboardPage() {
  return <DashboardContent />
}