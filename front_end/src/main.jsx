import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Thiết lập header mặc định cho tất cả các request axios
// Điều này giúp tự động vượt qua trang cảnh báo của ngrok mà không cần thêm thủ công vào từng API
axios.defaults.headers.common['ngrok-skip-browser-warning'] = '69420'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
