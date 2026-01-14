export default function Stats({ stats }) {
  if (!stats) {
    return <div className="loading">Загрузка статистики...</div>;
  }

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3>Всего пользователей</h3>
        <p className="stat-value">{stats.totalUsers}</p>
      </div>
      <div className="stat-card">
        <h3>Всего стримов</h3>
        <p className="stat-value">{stats.totalStreams}</p>
      </div>
      <div className="stat-card">
        <h3>Активных стримов</h3>
        <p className="stat-value">{stats.activeStreams}</p>
      </div>
      <div className="stat-card">
        <h3>Всего подарков</h3>
        <p className="stat-value">{stats.totalGifts}</p>
      </div>
      <div className="stat-card">
        <h3>Общий доход</h3>
        <p className="stat-value">${(stats.totalRevenue / 100).toFixed(2)}</p>
      </div>
    </div>
  );
}

