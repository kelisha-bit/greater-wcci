import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error('Fatal error during application startup:', error);
    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #f9fafb; font-family: system-ui, sans-serif;">
        <div style="max-width: 400px; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
          <h1 style="color: #b91c1c; font-size: 1.25rem; margin-bottom: 1rem;">Application Startup Failed</h1>
          <p style="color: #4b5563; font-size: 0.875rem;">Something went wrong while starting the application. Please check the console for details.</p>
          <button onclick="window.location.reload()" style="margin-top: 1.5rem; width: 100%; padding: 0.5rem; background: #111827; color: white; border-radius: 0.5rem; cursor: pointer;">Reload Application</button>
        </div>
      </div>
    `;
  }
}
