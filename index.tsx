
import React from 'react';
import ReactDOM from 'react-dom/client';
import { inject } from '@vercel/analytics';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Zero-config visitor analytics — view counts, top pages, referrers in the
// Vercel dashboard. No cookies, no PII, so it doesn't need a consent banner.
inject();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
