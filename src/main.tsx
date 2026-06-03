import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/700.css'
import App from './App'
import './styles/global.css'

const root_element = document.getElementById('root')

if (!root_element) {
  throw new Error('ルート要素 #root が見つかりません')
}

createRoot(root_element).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
