import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Cria instância do axios. Cookie HttpOnly é enviado automaticamente com credentials: true.
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor para lidar com erros de autenticação (cookie expirado/inválido)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie expirado ou inválido – a app deve refletir via getProfile/context
    }
    return Promise.reject(error);
  }
);

export default api;
