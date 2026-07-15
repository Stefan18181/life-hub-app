import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { applyTheme, loadTheme } from './lib/theme'

// Theme vor dem ersten Rendern setzen, um ein Aufblitzen zu vermeiden.
applyTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
