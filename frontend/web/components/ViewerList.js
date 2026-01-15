import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

/**
 * Компонент списка подключенных пользователей для стримера
 * 
 * Функционал:
 * - Отображает список всех подключенных зрителей
 * - Позволяет заблокировать пользователя
 * - Показывает статистику (количество зрителей)
 */
export default function ViewerList({ streamId, socket, onBlockUser, blockedUsers = [] }) {
  const [viewers, setViewers] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!socket || !streamId) return;

    // Запрос списка зрителей
    socket.emit('get-viewers', { streamId });

    // Слушаем обновления списка зрителей
    socket.on('viewers-list', (data) => {
      if (data.streamId === streamId) {
        setViewers(data.viewers || []);
        setViewerCount(data.count || 0);
      }
    });

    // Слушаем присоединение новых зрителей
    socket.on('viewer-joined', (data) => {
      if (data.streamId === streamId) {
        setViewers(prev => {
          const exists = prev.find(v => v.userId === data.viewerId);
          if (!exists) {
            return [...prev, {
              userId: data.viewerId,
              nickname: data.nickname || 'Гость',
              avatar: data.avatar,
              joinedAt: new Date()
            }];
          }
          return prev;
        });
        setViewerCount(prev => prev + 1);
      }
    });

    // Слушаем отключение зрителей
    socket.on('user-disconnected', (data) => {
      if (data.streamId === streamId) {
        setViewers(prev => prev.filter(v => v.userId !== data.userId));
        setViewerCount(prev => Math.max(0, prev - 1));
      }
    });

    return () => {
      socket.off('viewers-list');
      socket.off('viewer-joined');
      socket.off('user-disconnected');
    };
  }, [socket, streamId]);

  const handleBlock = (userId, nickname) => {
    if (window.confirm(`Заблокировать пользователя ${nickname}?`)) {
      onBlockUser(userId);
    }
  };

  return (
    <div className="viewer-list-container">
      <div className="viewer-list-header">
        <h3>Зрители ({viewerCount})</h3>
      </div>
      <div className="viewer-list-content">
        {viewers.length === 0 ? (
          <div className="no-viewers">Нет подключенных зрителей</div>
        ) : (
          viewers.map((viewer) => {
            const isBlocked = blockedUsers.includes(viewer.userId);
            return (
              <div key={viewer.userId} className={`viewer-item ${isBlocked ? 'blocked' : ''}`}>
                <div className="viewer-avatar">
                  {viewer.avatar ? (
                    <img src={viewer.avatar} alt={viewer.nickname} />
                  ) : (
                    <div className="avatar-placeholder">
                      {viewer.nickname?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="viewer-info">
                  <div className="viewer-nickname">{viewer.nickname}</div>
                  {isBlocked && <span className="blocked-badge">Заблокирован</span>}
                </div>
                {!isBlocked && (
                  <button
                    className="block-button"
                    onClick={() => handleBlock(viewer.userId, viewer.nickname)}
                    title="Заблокировать"
                  >
                    🚫
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      <style jsx>{`
        .viewer-list-container {
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          max-height: 200px;
        }

        .viewer-list-header {
          padding: 15px;
          background: #0f0f0f;
          border-bottom: 1px solid #333;
        }

        .viewer-list-header h3 {
          margin: 0;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
        }

        .viewer-list-content {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }

        .no-viewers {
          text-align: center;
          color: #999;
          padding: 20px;
          font-size: 14px;
        }

        .viewer-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #2a2a2a;
          border-radius: 6px;
          margin-bottom: 8px;
          transition: background 0.2s;
        }

        .viewer-item:hover {
          background: #333;
        }

        .viewer-item.blocked {
          opacity: 0.5;
        }

        .viewer-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .viewer-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          font-size: 18px;
          font-weight: bold;
          color: #fff;
        }

        .viewer-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .viewer-nickname {
          color: #fff;
          font-size: 14px;
          font-weight: 500;
        }

        .blocked-badge {
          font-size: 11px;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .block-button {
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .block-button:hover {
          background: rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </div>
  );
}

