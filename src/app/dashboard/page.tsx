import { FileStatus } from '@/components/file-status';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Knowledge Base Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <FileStatus />
      </div>
    </div>
  );
} 