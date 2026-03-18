import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 gap-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Wystąpił nieoczekiwany błąd</h1>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {this.state.error?.message || "Coś poszło nie tak. Spróbuj odświeżyć stronę."}
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={this.handleReset}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Spróbuj ponownie
            </Button>
            <Button onClick={() => window.location.reload()}>
              Odśwież stronę
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
