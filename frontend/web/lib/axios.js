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
    if (error.code === 'ECONNABORTED' || error.message === 'timeout exceeded' || error.code === 'ERR_CONNECTION_TIMED_OUT') {
      console.error('Запрос превысил время ожидания. Проверьте доступность сервера.');
      console.error('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    }
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      console.error('Ошибка сети. Сервер недоступен.');
      console.error('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    }
    // Обработка ошибок SSL-сертификата
    if (error.code === 'ERR_CERT_COMMON_NAME_INVALID' || 
        error.code === 'ERR_CERT_AUTHORITY_INVALID' ||
        error.message?.includes('certificate') ||
        error.message?.includes('SSL')) {
      console.error('⚠️ Ошибка SSL-сертификата. Сертификат не соответствует домену.');
      console.error('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
      console.error('Проверьте настройку SSL-сертификата на сервере.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

