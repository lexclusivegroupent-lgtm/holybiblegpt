import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Today, any uncaught render error anywhere in the app white-screens the
// entire site with no recovery — a user mid-study just sees a blank black
// page and has no idea what happened or what to do. This catches that,
// shows a themed, calm fallback instead of a crash, and gives a way back
// without losing trust in the product.
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Keep this console.error even in production — it's the only diagnostic
    // trail available right now (no error-reporting service wired up yet).
    console.error('Holy Bible GPT crashed:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-dvh w-full bg-black text-center px-6 gap-6">
          <span className="text-4xl" aria-hidden="true">✝</span>
          <div className="space-y-2 max-w-sm">
            <h1 className="text-lg font-bold uppercase tracking-widest text-[#D4AF37] accent-font">
              Something Went Wrong
            </h1>
            <p className="text-sm text-stone-400 leading-relaxed">
              Scripture is still true, even when the app isn't working right. Reload to get back to your study.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-bold text-sm uppercase tracking-wider"
          >
            Reload Holy Bible GPT
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
