import { useState, useEffect } from 'react';
import axios from 'axios';
import UsersList from './UsersList';
import StreamsList from './StreamsList';
import Stats from './Stats';
import ContentPages from './ContentPages';
import Settings from './Settings';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Админ-панель</h1>
        <button onClick={onLogout} className="logout-btn">Выйти</button>
      </header>
      
      <nav className="admin-nav">
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Статистика
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Пользователи
        </button>
        <button
          className={activeTab === 'streams' ? 'active' : ''}
          onClick={() => setActiveTab('streams')}
        >
          Стримы
        </button>
        <button
          className={activeTab === 'content' ? 'active' : ''}
          onClick={() => setActiveTab('content')}
        >
          Контент
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Настройки
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'stats' && <Stats stats={stats} />}
        {activeTab === 'users' && <UsersList />}
        {activeTab === 'streams' && <StreamsList />}
        {activeTab === 'content' && <ContentPages />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

