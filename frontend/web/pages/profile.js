import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const router = useRouter();
  const { user, logout, token, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setProfile(response.data.user);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    // Используем window.location для полной перезагрузки страницы
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Загрузка профиля...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link href="/">Вернуться на главную</Link>
      </div>
    );
  }

  const profileData = profile || user;

  return (
    <div className="container">
      <header className="header">
        <h1>🎥 Стриминговый Сервис</h1>
        <nav>
          <Link href="/">Главная</Link>
          <Link href="/stream/create">Начать стрим</Link>
          <button onClick={handleLogout} className="logout-btn">Выход</button>
        </nav>
      </header>

      <main className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar">
              {profileData?.avatar ? (
                <img src={profileData.avatar} alt={profileData.nickname} />
              ) : (
                <div className="avatar-placeholder">
                  {profileData?.nickname?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <h2>{profileData?.nickname || 'Пользователь'}</h2>
            <p className="profile-email">{profileData?.email}</p>
          </div>

          <div className="profile-stats">
            <div className="stat-card">
              <div className="stat-value">{profileData?.coins || 0}</div>
              <div className="stat-label">Монеты</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profileData?.beans || 0}</div>
              <div className="stat-label">Бобы</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profileData?.stats?.totalStreams || 0}</div>
              <div className="stat-label">Стримов</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profileData?.stats?.totalBeansEarned || 0}</div>
              <div className="stat-label">Заработано бобов</div>
            </div>
          </div>

          <div className="profile-actions">
            <Link href="/stream/create" className="action-button">
              Начать стрим
            </Link>
            <button onClick={handleLogout} className="action-button logout">
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        .profile-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .profile-container {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 40px;
          margin-top: 20px;
        }

        .profile-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .profile-avatar {
          width: 120px;
          height: 120px;
          margin: 0 auto 20px;
          border-radius: 50%;
          overflow: hidden;
          background: #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          font-size: 48px;
          font-weight: bold;
          color: #fff;
        }

        .profile-header h2 {
          color: #fff;
          font-size: 28px;
          margin-bottom: 8px;
        }

        .profile-email {
          color: #aaa;
          font-size: 16px;
        }

        .profile-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #6366f1;
          margin-bottom: 8px;
        }

        .stat-label {
          color: #aaa;
          font-size: 14px;
        }

        .profile-actions {
          display: flex;
          gap: 15px;
          flex-direction: column;
        }

        .action-button {
          padding: 12px 24px;
          border-radius: 8px;
          text-align: center;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
          border: none;
          cursor: pointer;
          font-size: 16px;
        }

        .action-button:not(.logout) {
          background: #6366f1;
          color: #fff;
        }

        .action-button:not(.logout):hover {
          background: #4f46e5;
        }

        .action-button.logout {
          background: #dc2626;
          color: #fff;
        }

        .action-button.logout:hover {
          background: #b91c1c;
        }

        .logout-btn {
          background: #dc2626;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .logout-btn:hover {
          background: #b91c1c;
        }

        .loading {
          text-align: center;
          color: #aaa;
          padding: 40px;
        }

        .error {
          background: #dc2626;
          color: #fff;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
}

