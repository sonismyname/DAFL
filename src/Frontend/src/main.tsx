import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MockPayOSStandalonePage } from './components/checkout/MockPayOSStandalonePage';
import { PaymentSuccessPage } from './components/checkout/PaymentSuccessPage';
import './index.css';

const pathname = window.location.pathname;
const isMockPayOS = pathname.startsWith('/mock-payos');
const isPaymentSuccess = pathname.startsWith('/payment-success');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isMockPayOS ? (
      <MockPayOSStandalonePage />
    ) : isPaymentSuccess ? (
      <PaymentSuccessPage />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

