import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import StreamBroadcaster from '../../components/StreamBroadcaster';

export default function CreateStream() {
  const router = useRouter();
  const { user, isAuthenticated, token, loading: authLoading } = useAuth();
  const [stream, setStream] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingActive, setCheckingActive] = useState(true);
  const [stuckStream, setStuckStream] = useState(null);

  // Восстанавливаем стрим из sessionStorage при загрузке
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStream = sessionStorage.getItem('activeStream');
      if (savedStream) {
        try {
          const streamData = JSON.parse(savedStream);
          console.log('Восстановлен стрим из sessionStorage:', streamData);
          setStream(streamData);
          setCheckingActive(false);
        } catch (err) {
          console.error('Ошибка восстановления стрима из sessionStorage:', err);
          sessionStorage.removeItem('activeStream');
        }
      }
    }
  }, []);

  useEffect(() => {
    // Не делаем ничего, пока идет загрузка авторизации
    if (authLoading) {
      return;
    }

    // Если стрим уже восстановлен из sessionStorage, не проверяем снова
    if (stream) {
      setCheckingActive(false);
      return;
    }

    // Проверяем, есть ли активный стрим (делаем это всегда, даже если нет токена)
    const checkActiveStream = async () => {
      if (!token) {
        setCheckingActive(false);
        return;
      }
      
      setCheckingActive(true);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/my/active`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.stream) {
          // Найден активный стрим - продолжаем его
          console.log('Найден активный стрим, продолжаем:', response.data.stream);
          setStream(response.data.stream);
          // Сохраняем в sessionStorage для восстановления при перезагрузке
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('activeStream', JSON.stringify(response.data.stream));
          }
        }
      } catch (err) {
        // Активного стрима нет - это нормально
        if (err.response?.status === 404) {
          console.log('Активного стрима нет, можно создать новый');
          // Удаляем сохраненный стрим, если его нет на сервере
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('activeStream');
          }
        } else if (err.response?.status === 401) {
          // Токен истек - не делаем редирект, просто логируем
          console.warn('Токен истек при проверке активного стрима. Продолжаем работу.');
          // НЕ делаем router.push('/login') здесь, чтобы не прерывать стрим
        } else {
          console.error('Ошибка проверки активного стрима:', err);
        }
      } finally {
        setCheckingActive(false);
      }
    };

    checkActiveStream();
  }, [authLoading, token, stream]);

  // Отдельный useEffect для редиректа - только после завершения проверки
  useEffect(() => {
    // НИКОГДА не делаем редирект, если стрим уже начат
    // Это предотвращает прерывание стрима при обновлении страницы
    if (stream) {
      return;
    }

    // Проверяем, есть ли сохраненный стрим в sessionStorage
    const savedStream = typeof window !== 'undefined' ? sessionStorage.getItem('activeStream') : null;
    if (savedStream) {
      console.log('Найден сохраненный стрим в sessionStorage, не делаем редирект');
      return;
    }

    // Не делаем редирект, пока идет загрузка или проверка
    if (authLoading || checkingActive) {
      return;
    }

    // Проверяем, есть ли токен в localStorage (даже если он истек)
    // Это нужно, чтобы не делать редирект, пока не проверим активный стрим
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Если есть токен в localStorage, но isAuthenticated false (токен истек),
    // все равно не делаем редирект сразу - возможно, стрим еще активен
    if (savedToken && !isAuthenticated) {
      console.log('Токен найден в localStorage, но isAuthenticated false - возможно токен истек, но стрим может быть активен');
      return;
    }

    // Делаем редирект только если точно нет авторизации И нет стрима И нет токена в localStorage
    // И все проверки завершены
    if (!isAuthenticated && !stream && !savedToken) {
      console.log('Редирект на /login: нет авторизации, нет стрима, нет токена');
      router.push('/login');
    }
  }, [authLoading, checkingActive, isAuthenticated, stream, router]);

  // Функция для завершения зависшего стрима
  const handleEndStuckStream = async () => {
    if (!token) return;
    
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/my/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setStuckStream(null);
      // Обновляем страницу для проверки активного стрима
      window.location.reload();
    } catch (err) {
      console.error('Ошибка завершения зависшего стрима:', err);
      setError(err.response?.data?.error || 'Ошибка завершения стрима');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateStream = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setStream(response.data.stream);
      // Сохраняем в sessionStorage для восстановления при перезагрузке
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('activeStream', JSON.stringify(response.data.stream));
      }
    } catch (err) {
      // Если есть активный стрим, используем его вместо ошибки
      if (err.response?.status === 400 && err.response?.data?.stream) {
        console.log('Найден активный стрим, продолжаем его:', err.response.data.stream);
        setStream(err.response.data.stream);
        // Сохраняем в sessionStorage для восстановления при перезагрузке
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('activeStream', JSON.stringify(err.response.data.stream));
        }
      } else if (err.response?.status === 401) {
        // Токен истек - не делаем редирект, просто показываем ошибку
        console.warn('Токен истек при создании стрима. Попробуйте обновить страницу.');
        setError('Сессия истекла. Пожалуйста, обновите страницу и войдите снова.');
        // НЕ делаем router.push('/login') здесь, чтобы пользователь мог обновить страницу
      } else {
        setError(err.response?.data?.error || 'Ошибка создания стрима');
      }
    } finally {
      setLoading(false);
    }
  };

  // Показываем загрузку при проверке авторизации или активного стрима
  if (authLoading || checkingActive) {
    return (
      <div className="container">
        <div className="loading">
          {authLoading ? 'Загрузка...' : 'Проверка активного стрима...'}
        </div>
      </div>
    );
  }

  // Не делаем редирект, если стрим уже начат
  // Это предотвращает прерывание стрима при временной потере токена
  if (!isAuthenticated && !stream) {
    return null;
  }

  // Если найден активный стрим, показываем его
  if (stream) {
    return <StreamBroadcaster stream={stream} user={user} />;
  }

  return (
    <div className="container">
      <div className="create-stream-form">
        <h2>Создать стрим</h2>
        {error && <div className="error">{error}</div>}
        {stuckStream && (
          <div className="stuck-stream-warning">
            <p>Обнаружен зависший стрим. Он будет автоматически завершен через несколько секунд.</p>
            <button onClick={handleEndStuckStream} className="end-stuck-button">
              Завершить зависший стрим сейчас
            </button>
          </div>
        )}
        <form onSubmit={handleCreateStream}>
          <input
            type="text"
            name="title"
            placeholder="Название стрима"
            value={formData.title}
            onChange={handleChange}
            required
          />
          <textarea
            name="description"
            placeholder="Описание (необязательно)"
            value={formData.description}
            onChange={handleChange}
            rows={4}
          />
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="gaming">Игры</option>
            <option value="music">Музыка</option>
            <option value="talk">Разговоры</option>
            <option value="sports">Спорт</option>
            <option value="education">Образование</option>
            <option value="other">Другое</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Начать стрим'}
          </button>
        </form>
      </div>
    </div>
  );
}

