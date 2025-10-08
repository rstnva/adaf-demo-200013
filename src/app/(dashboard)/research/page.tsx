import { Metadata } from 'next';
import { ResearchPanel } from '@/components/research/ResearchPanel';

export const metadata: Metadata = {
  title: 'Research & Backtesting',
  description: 'Signal-based strategy research and backtesting sandbox',
};

/**
 * Research page - server component shell for the backtesting interface
 */
export default function ResearchPage() {
  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Research & Backtesting</h1>
          <p className="text-muted-foreground">
            Design, test, and evaluate signal-based trading strategies
          </p>
        </div>
      </div>
      
      <ResearchPanel />
    </div>
  );
}