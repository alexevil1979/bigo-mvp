import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        params: { search, limit: 50 }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (userId, coins, beans) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${userId}/balance`,
        { coins, beans }
      );
      fetchUsers();
    } catch (error) {
      alert('Ошибка обновления баланса');
    }
  };

  const toggleBan = async (userId, isBanned) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${userId}/ban`,
        { isBanned: !isBanned }
      );
      fetchUsers();
    } catch (error) {
      alert('Ошибка изменения статуса бана');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="users-list">
      <input
        type="text"
        placeholder="Поиск пользователей..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Никнейм</th>
            <th>Монеты</th>
            <th>Бобы</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.email}</td>
              <td>{user.nickname}</td>
              <td>
                <input
                  type="number"
                  value={user.coins}
                  onChange={(e) => updateBalance(user._id, e.target.value, user.beans)}
                  style={{ width: '80px' }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={user.beans}
                  onChange={(e) => updateBalance(user._id, user.coins, e.target.value)}
                  style={{ width: '80px' }}
                />
              </td>
              <td>{user.role}</td>
              <td>
                {user.isBanned ? 'Забанен' : 'Активен'}
              </td>
              <td>
                <button
                  onClick={() => toggleBan(user._id, user.isBanned)}
                  className={user.isBanned ? 'unban-btn' : 'ban-btn'}
                >
                  {user.isBanned ? 'Разбанить' : 'Забанить'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

