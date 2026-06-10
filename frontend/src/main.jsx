import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index.js'
import './index.css'
import App from './App.jsx'
import { initDevAuthFromUrl, installDevFetchShim } from './lib/devAuth.js'

// DEV-ONLY: pick up ?devUser=<id> persona impersonation and patch fetch so API
// calls carry the dev auth token. No-op in production builds.
initDevAuthFromUrl();
installDevFetchShim();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
