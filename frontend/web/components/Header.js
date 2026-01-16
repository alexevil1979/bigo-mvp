import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="header">
      <h1>
        <img src="/favicon.ico" alt="NIO" className="logo-icon" /> NIO - LIVE
      </h1>
      <nav>
        {isAuthenticated ? (
          <>
            <span className="user-info">
              <span className="user-icon">👤</span>
              <span className="user-name">{user?.nickname || 'Пользователь'}</span>
            </span>
            <Link href="/profile">Профиль</Link>
            <Link href="/stream/create">Начать стрим</Link>
            <button onClick={handleLogout} className="logout-btn">Выход</button>
          </>
        ) : (
          <>
            <Link href="/login">Вход</Link>
            <Link href="/register">Регистрация</Link>
          </>
        )}
      </nav>
      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 30px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          margin-bottom: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
          font-size: 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          object-fit: contain;
          vertical-align: middle;
        }

        .header nav {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .header nav a {
          color: #333;
          text-decoration: none;
          padding: 10px 18px;
          border-radius: 8px;
          transition: all 0.2s;
          font-weight: 500;
          white-space: nowrap;
        }

        .header nav a:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          transform: translateY(-2px);
        }

        .user-info {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          font-weight: 600;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
          white-space: nowrap;
        }

        .user-icon {
          font-size: 18px;
        }

        .user-name {
          font-size: 14px;
        }

        .logout-btn {
          background: #dc2626;
          color: #fff;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .logout-btn:hover {
          background: #b91c1c;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 15px;
            padding: 15px 20px;
          }

          .header h1 {
            font-size: 24px;
          }

          .header nav {
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
          }

          .header nav a,
          .user-info,
          .logout-btn {
            font-size: 12px;
            padding: 8px 14px;
          }
        }
      `}</style>
    </header>
  );
}



