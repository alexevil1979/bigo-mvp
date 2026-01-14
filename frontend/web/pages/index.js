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
              <span className="user-info">
                👤 {user?.nickname || 'Пользователь'}
              </span>
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

      <main className="main-content">
        <div className="main-header">
          <h2>🎥 Активные стримы</h2>
          <div className="stream-tabs">
            <button className="tab active">Все</button>
            <button className="tab">Игры</button>
            <button className="tab">Музыка</button>
            <button className="tab">Разговоры</button>
            <button className="tab">Ещё</button>
          </div>
        </div>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p>Загрузка стримов...</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📺</div>
            <h3>Нет активных стримов</h3>
            <p>Будьте первым, кто начнет стрим!</p>
            {isAuthenticated && (
              <Link href="/stream/create" className="start-stream-btn">
                Начать стрим
              </Link>
            )}
          </div>
        ) : (
          <div className="streams-grid">
            {streams.map(stream => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
        )}
      </main>
      <style jsx>{`
        .main-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .main-header {
          margin-bottom: 30px;
        }

        .main-header h2 {
          font-size: 32px;
          color: #333;
          margin-bottom: 20px;
          font-weight: 700;
        }

        .stream-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tab {
          padding: 10px 20px;
          border: 2px solid #e0e0e0;
          background: #fff;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
          color: #666;
        }

        .tab:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border-color: transparent;
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner-large {
          width: 60px;
          height: 60px;
          border: 5px solid #e0e0e0;
          border-top: 5px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
        }

        .empty-icon {
          font-size: 80px;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          font-size: 24px;
          color: #333;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 30px;
        }

        .start-stream-btn {
          display: inline-block;
          padding: 15px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 600;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .start-stream-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
      `}</style>
    </div>
  );
}

