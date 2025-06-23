
import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Disable React DevTools in production
if (import.meta.env.PROD) {
  // @ts-ignore
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
}

createRoot(document.getElementById("root")!).render(<App />);
