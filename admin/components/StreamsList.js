import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export default function StreamsList() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchStreams();
  }, [statusFilter]);

  const fetchStreams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/streams`, {
        params: { status: statusFilter || undefined, limit: 50 }
      });
      setStreams(response.data.streams);
    } catch (error) {
      console.error('Ошибка загрузки стримов:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (streamId, isBanned) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/streams/${streamId}/ban`,
        { isBanned: !isBanned, banReason: 'Нарушение правил' }
      );
      fetchStreams();
    } catch (error) {
      alert('Ошибка изменения статуса бана');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="streams-list">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="filter-select"
      >
        <option value="">Все стримы</option>
        <option value="live">Активные</option>
        <option value="ended">Завершенные</option>
      </select>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Стример</th>
            <th>Статус</th>
            <th>Зрителей</th>
            <th>Подарков</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {streams.map(stream => (
            <tr key={stream._id}>
              <td>{stream.title}</td>
              <td>{stream.streamer?.nickname}</td>
              <td>{stream.status}</td>
              <td>{stream.viewerCount}</td>
              <td>{stream.stats?.totalGifts || 0}</td>
              <td>
                <button
                  onClick={() => toggleBan(stream._id, stream.isBanned)}
                  className={stream.isBanned ? 'unban-btn' : 'ban-btn'}
                >
                  {stream.isBanned ? 'Разбанить' : 'Забанить'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

