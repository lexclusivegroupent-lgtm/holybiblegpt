
import React from 'react';
import ReactDOM from 'react-dom/client';
import { inject } from '@vercel/analytics';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/crimson-pro/400.css';
import '@fontsource/crimson-pro/400-italic.css';
import '@fontsource/crimson-pro/700.css';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './components/AuthProvider';
import { initClientSentry } from './services/sentryClient';
import { restoreAuthReturnPath } from './services/authSession';

// VITE_SENTRY_DSN is inlined at build time. An empty value leaves Sentry off
// and does not download the SDK.
void initClientSentry(import.meta.env.VITE_SENTRY_DSN);

// If sign-in sent the browser away, come back to the page they were reading.
restoreAuthReturnPath();

// Page-view counts for the Vercel dashboard. Disclosed in the privacy policy.
inject();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
