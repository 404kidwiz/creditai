import { ProductionMonitoringDashboard } from '@/components/monitoring/ProductionMonitoringDashboard';

export default function PDFProcessingMonitoringPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">PDF Processing Monitoring</h1>
      <ProductionMonitoringDashboard />
    </div>
  );
}