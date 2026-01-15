import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import StreamBroadcaster from '../../components/StreamBroadcaster';

export default function CreateStream() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuth();
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Проверяем, есть ли активный стрим
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
        }
      } catch (err) {
        // Активного стрима нет - это нормально
        if (err.response?.status === 404) {
          console.log('Активного стрима нет, можно создать новый');
        } else {
          console.error('Ошибка проверки активного стрима:', err);
        }
      } finally {
        setCheckingActive(false);
      }
    };

    checkActiveStream();
  }, [isAuthenticated, token, router]);

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
    } catch (err) {
      // Если есть активный стрим, используем его вместо ошибки
      if (err.response?.status === 400 && err.response?.data?.stream) {
        console.log('Найден активный стрим, продолжаем его:', err.response.data.stream);
        setStream(err.response.data.stream);
      } else {
        setError(err.response?.data?.error || 'Ошибка создания стрима');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // Показываем загрузку при проверке активного стрима
  if (checkingActive) {
    return (
      <div className="container">
        <div className="loading">Проверка активного стрима...</div>
      </div>
    );
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

