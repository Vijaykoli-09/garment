import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { NotificationProvider } from "./pages/Notifications";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <NotificationProvider>
    <App />
</NotificationProvider>
  </React.StrictMode>
);
  
// Only run web-vitals in development to reduce production CPU/overhead
if (process.env.NODE_ENV === "development" && typeof reportWebVitals === "function") {
  reportWebVitals(console.log);
}
