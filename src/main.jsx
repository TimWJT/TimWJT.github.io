import { Component, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    // Points at the fallback heading once the fallback is on screen.
    this.alertRef = createRef();
    this.reported = null;
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    this.announce();
  }

  componentDidUpdate() {
    this.announce();
  }

  // Runs after a commit, never during render, so the fallback is on the page
  // before it is announced and before focus moves. Both hooks are needed: the
  // boundary is normally already mounted when a child throws, but a throw
  // during the boundary's own first mount still has to reach the visitor.
  announce() {
    const { error } = this.state;
    // Once per error. A boundary that re-renders while in the fallback would
    // otherwise re-announce on every commit.
    if (!error || error === this.reported) return;
    this.reported = error;
    // The thrown value can carry an internal file name, a package name, or a
    // fragment of whatever the visitor typed, so it goes to the console and
    // never to the page. This is console.error rather than console.warn because
    // it is a real fault, and it only runs on the error path, so a clean render
    // still logs nothing at all.
    console.error('ErrorBoundary caught a render error:', error);
    // Without this a screen-reader user is left wherever the crashed subtree
    // last put them, with no idea the page they were reading is gone.
    this.alertRef.current?.focus();
  }

  render() {
    // React error boundaries catch render and lifecycle errors ONLY. A throw
    // inside a requestAnimationFrame callback or an event handler — which is
    // where the easter eggs in src/motion/ do their risky work — is not caught
    // here and surfaces as an uncaught global error instead. The animation
    // loops are the likeliest thing to fault on a real page.
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: '2rem', fontFamily: 'monospace', color: '#e8e6e3', background: '#111' }}>
          {/* tabIndex -1 keeps it out of the tab order but focusable on demand,
              so the live region and the focus move reinforce each other. */}
          <h1 ref={this.alertRef} tabIndex={-1} style={{ marginTop: 0 }}>Something went wrong</h1>
          <p style={{ maxWidth: '40rem' }}>
            This page hit an error and stopped. Reloading it is the next thing to try.
            The details are in the browser console.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Exported so the fallback can be exercised without booting the whole app.
export { ErrorBoundary };

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}
