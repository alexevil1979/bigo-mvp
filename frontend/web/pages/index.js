import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import StreamCard from '../components/StreamCard';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams`);
      setStreams(response.data.streams || []);
    } catch (error) {
      console.error('Ошибка загрузки стримов:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🎥 Стриминговый Сервис</h1>
        <nav>
          {isAuthenticated ? (
            <>
              <Link href="/profile">Профиль</Link>
              <Link href="/stream/create">Начать стрим</Link>
              <Link href="/logout">Выход</Link>
            </>
          ) : (
            <>
              <Link href="/login">Вход</Link>
              <Link href="/register">Регистрация</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <h2>Активные стримы</h2>
        {loading ? (
          <p>Загрузка...</p>
        ) : streams.length === 0 ? (
          <p>Нет активных стримов</p>
        ) : (
          <div className="streams-grid">
            {streams.map(stream => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

