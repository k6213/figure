import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

// Attach the Supabase access_token on every request.
// useAuthStore.getState() is safe to call outside React components.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      import('../store/authStore').then(({ useAuthStore }) => {
        // signOut()은 Supabase 서버 세션까지 삭제하므로 호출하지 않는다.
        // 로컬 상태만 초기화하고 로그인 페이지로 이동한다.
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
        window.location.href = '/login'
      })
    }
    return Promise.reject(err)
  }
)

export default api
