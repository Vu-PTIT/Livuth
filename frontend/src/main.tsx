import { /* StrictMode */ } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SuiWalletProvider } from './providers/SuiWalletProvider';

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <SuiWalletProvider>
      <App />
    </SuiWalletProvider>
  </GoogleOAuthProvider>
);
