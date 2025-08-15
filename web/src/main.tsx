import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import App from './App';

// Capture Cognito Hosted UI id_token from hash and persist
try {
  if (location.hash && location.hash.includes('id_token=')) {
    const params = new URLSearchParams(location.hash.slice(1));
    const id = params.get('id_token');
    if (id) {
      localStorage.setItem('idToken', id);
      history.replaceState(null, '', location.pathname + location.search);
    }
  }
} catch {}

const theme = createTheme({ direction: 'rtl' });
document.dir = 'rtl';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
