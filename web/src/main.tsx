import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Apply cached theme immediately to prevent flash
const cachedTheme = localStorage.getItem('theme') || 'dark'
const cachedAccentHue = localStorage.getItem('accentHue') || '190'
document.documentElement.setAttribute('data-theme', cachedTheme)
document.documentElement.style.setProperty('--accent-hue', cachedAccentHue)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
