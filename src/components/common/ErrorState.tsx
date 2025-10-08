/**
 * Unified error state component with retry functionality
 */

import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error;
  onRetry?: () => void;
  onViewMore?: () => void;
  variant?: 'default' | 'minimal' | 'connection' | 'critical';
  className?: string;
}

export function ErrorState({
  title,
  message,
  error,
  onRetry,
  onViewMore,
  variant = 'default',
  className,
}: ErrorStateProps) {
  const getIcon = () => {
    switch (variant) {
      case 'connection':
        return <WifiOff className="h-8 w-8 text-red-500" />;
      case 'critical':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      case 'minimal':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    
    switch (variant) {
      case 'connection':
        return 'Connection Error';
      case 'critical':
        return 'Critical Error';
      case 'minimal':
        return 'Error';
      default:
        return 'Failed to Load Data';
    }
  };

  const getMessage = () => {
    if (message) return message;
    if (error?.message) return error.message;
    
    switch (variant) {
      case 'connection':
        return 'Unable to connect to the server. Please check your connection.';
      case 'critical':
        return 'A critical error occurred. Please contact support.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2 text-red-600', className)}>
        {getIcon()}
        <span className="text-sm">{getMessage()}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('text-center py-8', className)}>
      <div className="flex flex-col items-center gap-4">
        {getIcon()}
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-red-700">
            {getTitle()}
          </h3>
          <p className="text-sm text-red-600 max-w-sm mx-auto">
            {getMessage()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          {onViewMore && (
            <Button variant="ghost" size="sm" onClick={onViewMore}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Predefined error states for common scenarios
 */
export const ErrorStates = {
  NetworkError: (props: Pick<ErrorStateProps, 'onRetry'>) => (
    <ErrorState 
      variant="connection"
      title="Network Error"
      message="Unable to fetch data. Please check your connection and try again."
      {...props}
    />
  ),
  
  ApiError: (props: Pick<ErrorStateProps, 'onRetry' | 'error'>) => (
    <ErrorState 
      title="API Error"
      message={props.error?.message || "The server returned an error."}
      {...props}
    />
  ),
  
  NotFound: (props: Pick<ErrorStateProps, 'onViewMore'>) => (
    <ErrorState 
      title="No Data Found"
      message="No data is available for the selected criteria."
      onRetry={undefined}
      {...props}
    />
  ),
  
  Timeout: (props: Pick<ErrorStateProps, 'onRetry'>) => (
    <ErrorState 
      title="Request Timeout"
      message="The request is taking too long. Please try again."
      {...props}
    />
  ),
};