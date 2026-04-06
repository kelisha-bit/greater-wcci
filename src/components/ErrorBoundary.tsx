import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex items-center justify-center p-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-8 max-w-md w-full text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-800 mb-2">
              Something went wrong
            </h1>
            <p className="text-stone-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-rose-50 rounded-xl border border-rose-200 text-left">
                <p className="text-xs font-mono text-rose-700 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
