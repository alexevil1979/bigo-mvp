import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);

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
      setError(err.response?.data?.error || 'Ошибка создания стрима');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (stream) {
    return <StreamBroadcaster stream={stream} user={user} />;
  }

  return (
    <div className="container">
      <div className="create-stream-form">
        <h2>Создать стрим</h2>
        {error && <div className="error">{error}</div>}
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

