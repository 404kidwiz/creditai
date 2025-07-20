import { UserFeedbackForm } from '@/components/analysis/UserFeedbackForm';

export default function PDFProcessingFeedbackPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">PDF Processing Feedback</h1>
      <UserFeedbackForm processingId="test-processing-id" />
    </div>
  );
}