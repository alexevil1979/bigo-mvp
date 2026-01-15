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

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime) return '—';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.floor((end - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м ${seconds}с`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      live: { text: 'LIVE', class: 'status-live' },
      ended: { text: 'Завершен', class: 'status-ended' },
      scheduled: { text: 'Запланирован', class: 'status-scheduled' }
    };
    return badges[status] || { text: status, class: '' };
  };

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
        <option value="scheduled">Запланированные</option>
      </select>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Аватар</th>
            <th>Название</th>
            <th>Стример</th>
            <th>Статус</th>
            <th>Начало</th>
            <th>Конец</th>
            <th>Продолжительность</th>
            <th>Зрителей</th>
            <th>Подарков</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {streams.map(stream => {
            const statusBadge = getStatusBadge(stream.status);
            return (
              <tr key={stream._id}>
                <td>
                  {stream.streamer?.avatar ? (
                    <img 
                      src={stream.streamer.avatar} 
                      alt={stream.streamer.nickname}
                      className="streamer-avatar-small"
                    />
                  ) : (
                    <div className="avatar-placeholder-small">
                      {stream.streamer?.nickname?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </td>
                <td>{stream.title}</td>
                <td>{stream.streamer?.nickname || 'Неизвестно'}</td>
                <td>
                  <span className={`status-badge ${statusBadge.class}`}>
                    {statusBadge.text}
                  </span>
                </td>
                <td>{formatDate(stream.startedAt || stream.createdAt)}</td>
                <td>{formatDate(stream.endedAt)}</td>
                <td>{calculateDuration(stream.startedAt || stream.createdAt, stream.endedAt)}</td>
                <td>{stream.viewerCount || 0}</td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

