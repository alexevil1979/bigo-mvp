import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 секунд вместо дефолтных 5
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем interceptor для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message === 'timeout exceeded') {
      console.error('Запрос превысил время ожидания. Проверьте доступность сервера.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

