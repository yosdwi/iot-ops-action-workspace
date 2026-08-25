import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './v2.css'
import './stabilize.css'
import './stability-patch.css'
import './master-data.css'
import './dropdown-scroll-patch.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
