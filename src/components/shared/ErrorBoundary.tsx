import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
const debugLogging = import.meta.env.VITE_DEBUG_LOGGING === 'true';

/**
 * Error Boundary Component
 * 
 * Catches React component errors and displays a user-friendly fallback UI.
 * In production, shows generic error messages without exposing stack traces.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details only if debug logging is enabled
    if (debugLogging) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    } else if (!isProduction) {
      // In development, always log errors
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Production-safe error UI
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                {isProduction
                  ? 'An unexpected error occurred. Please try refreshing the page.'
                  : 'An error occurred while rendering this component.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isProduction && this.state.error && (
                <div className="rounded-md bg-muted p-3 text-body">
                  <p className="font-medium mb-1">Error:</p>
                  <p className="text-muted-foreground font-mono text-caption break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {debugLogging && this.state.errorInfo && (
                <details className="rounded-md bg-muted p-3 text-body">
                  <summary className="cursor-pointer font-medium mb-2">Stack Trace</summary>
                  <pre className="text-caption overflow-auto max-h-48 text-muted-foreground font-mono">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="default">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

