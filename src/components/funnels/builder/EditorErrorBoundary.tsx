import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h3 className="text-lg font-semibold">Editor crashed</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Something went wrong in the page builder. Your last saved changes are safe.
          </p>
          <Button onClick={this.handleReset} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" /> Reload Editor
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
