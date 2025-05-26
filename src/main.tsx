import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { fetchInitialData } from './utils/storage';

// Mount the app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Fetch initial data after mounting
fetchInitialData().then(data => {
  // This will be loaded by the App component through localStorage
  if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
    localStorage.setItem('promptAppData', JSON.stringify(data));
  }
});