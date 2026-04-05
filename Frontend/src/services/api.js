import axios from 'axios'
import { getToken } from '../utils/auth'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
})

// Auto-attach JWT to every request
API.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalize error responses
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

export default API