import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/global.css';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('[PWA] Shell cached — offline UI available');
  },
  onNeedRefresh() {
    console.info('[PWA] New version available — reload to update');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
