import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/app';
import { AppProviders } from './app/providers';
import './i18n/config';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <NuqsAdapter>
        <AppProviders>
          <App />
        </AppProviders>
      </NuqsAdapter>
    </BrowserRouter>
  </React.StrictMode>,
);
