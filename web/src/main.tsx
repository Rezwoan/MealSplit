import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Apply cached theme immediately to prevent flash
const cachedTheme = localStorage.getItem('theme') || 'dark'
const cachedAccentColor = localStorage.getItem('accentColor') || '#3B82F6'

// Convert hex to RGB for CSS variables
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '59 130 246'
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}

document.documentElement.setAttribute('data-theme', cachedTheme)
document.documentElement.style.setProperty('--accent', hexToRgb(cachedAccentColor))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
