import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import StreamPlayer from '../../components/StreamPlayer';
import StreamBroadcaster from '../../components/StreamBroadcaster';
import StreamEnded from '../../components/StreamEnded';
import Chat from '../../components/Chat';
import GiftPanel from '../../components/GiftPanel';
import Header from '../../components/Header';
import SEO from '../../components/SEO';
import io from 'socket.io-client';

export default function StreamPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated, token } = useAuth();
  
  // Все хуки должны быть в начале, до любых условных возвратов
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStreamer, setIsStreamer] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [bottomChatInput, setBottomChatInput] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    if (id) {
      fetchStream();
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;

    // Слушаем событие завершения стрима
    socket.on('stream-ended', (data) => {
      if (data.streamId === id) {
        fetchStream();
      }
    });

    // Слушаем обновления списка стримов
    socket.on('stream-list-updated', (data) => {
      if (data.type === 'ended' && data.streamId === id) {
        fetchStream();
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Удаляем overlay с ID и логотипом из DOM при монтировании и обновлении
  useEffect(() => {
    const removeOverlay = () => {
      // Ищем и удаляем все элементы с overlay
      const selectors = [
        '[class*="video-overlay-gradient"]',
        '[class*="overlay-content"]',
        '[class*="nio-logo-img"]',
        '[class*="stream-id-overlay"]',
        '[class*="stream-info-overlay"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // Проверяем, что элемент находится внутри video-wrapper или stream-player
          const isInVideoWrapper = el.closest('.video-wrapper') || el.closest('.stream-player');
          if (isInVideoWrapper) {
            el.remove();
          }
        });
      });
    };

    // Удаляем сразу
    removeOverlay();
    
    // Удаляем периодически на случай, если элемент создается динамически
    const interval = setInterval(removeOverlay, 100);
    
    return () => clearInterval(interval);
  }, [id]);

  const fetchStream = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/${id}`
      );
      const streamData = response.data.stream;
      
      console.log('[StreamPage] Загружен стрим:', {
        id: streamData._id,
        status: streamData.status,
        title: streamData.title
      });
      
      setStream(streamData);
      
      // Проверяем, является ли пользователь стримером
      if (isAuthenticated && user && streamData.streamer) {
        const streamerId = typeof streamData.streamer === 'object' 
          ? streamData.streamer._id 
          : streamData.streamer;
        const userId = typeof user.id === 'string' ? user.id : user.id?.toString();
        
        if (streamerId === userId || streamerId?.toString() === userId) {
          setIsStreamer(true);
        }
      }
    } catch (error) {
      console.error('[StreamPage] Ошибка загрузки стрима:', error);
      // Если стрим не найден или завершен, не показываем ошибку, а показываем StreamEnded
      if (error.response?.status === 404) {
        setStream({ _id: id, status: 'ended' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndStream = async () => {
    if (!token || !id) return;
    
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/${id}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      router.push('/');
    } catch (error) {
      console.error('Ошибка завершения стрима:', error);
      alert('Ошибка завершения стрима');
    }
  };

  // Условные возвраты только после всех хуков
  if (loading) {
    return <div className="container">Загрузка...</div>;
  }

  if (!stream) {
    return <div className="container">Стрим не найден</div>;
  }

  // Если стрим завершен, показываем экран завершения
  if (stream.status !== 'live') {
    return <StreamEnded stream={stream} />;
  }

  // Если пользователь - стример, показываем страницу стримера
  if (isStreamer && isAuthenticated) {
    return <StreamBroadcaster stream={stream} user={user} />;
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: stream.title,
        text: `Смотри стрим ${stream.streamer?.nickname} на NIO`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Ссылка скопирована в буфер обмена');
    }
  };

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setIsSubscribed(!isSubscribed);
    // TODO: Реализовать подписку на бэкенде
  };

  const handleBottomChatSend = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Предотвращаем всплытие события
    if (!bottomChatInput.trim() || !socketRef.current || !isAuthenticated) return;

    socketRef.current.emit('send-message', {
      streamId: id,
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      message: bottomChatInput.trim()
    });

    setBottomChatInput('');
    
    // Предотвращаем скролл страницы
    return false;
  };

  const streamImage = stream.streamer?.avatar || '/favicon.ico';
  const streamUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SEO
        title={`${stream.title || 'Стрим'} - NIO - LIVE`}
        description={`Смотри прямой стрим от ${stream.streamer?.nickname || 'стримера'} на NIO. ${stream.title || 'Присоединяйтесь к трансляции прямо сейчас!'}`}
        keywords={`стрим, ${stream.streamer?.nickname || ''}, ${stream.category || ''}, live stream, NIO`}
        image={streamImage}
        url={streamUrl}
        type="video.other"
      />
      <div className="container">
        <Header />
      </div>
      <div className="nio-stream-page">
        {/* Верхняя панель с профилем стримера */}
        <div className="stream-header">
        <div className="streamer-profile">
          <div className="streamer-avatar">
            {stream.streamer?.avatar ? (
              <img src={stream.streamer.avatar} alt={stream.streamer.nickname} />
            ) : (
              <div className="avatar-placeholder">
                {stream.streamer?.nickname?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="streamer-info">
            <div className="streamer-name-row">
              <span className="streamer-name">{stream.streamer?.nickname || 'Стример'}</span>
              <span className="online-indicator">●</span>
            </div>
          </div>
          <div className="streamer-stats">
            <div className="stat-item">
              <span className="stat-icon">💰</span>
              <span className="stat-value">{stream.streamer?.beans || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💬</span>
              <span className="stat-value">{stream.viewerCount || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">👁️</span>
              <span className="stat-value">{stream.viewerCount || 0}</span>
            </div>
          </div>
        </div>
        <div className="stream-actions">
          <button onClick={handleShare} className="share-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
            Поделиться
          </button>
          <button 
            onClick={handleSubscribe} 
            className={`subscribe-button ${isSubscribed ? 'subscribed' : ''}`}
          >
            {isSubscribed ? '✓ Подписка' : '+ Подписаться'}
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="stream-main-content">
        <div className="stream-video-section">
          <div className="video-wrapper">
            <StreamPlayer stream={stream} user={user} />
          </div>
          <div className="stream-welcome">
            <p>Наслаждайся прямыми эфирами</p>
          </div>
          <div className="stream-rules-warning">
            <p><strong>Мы постоянно следим за качеством трансляций.</strong></p>
            <p>Запрещено: курение, употребление алкоголя, использование ненормативной лексики, обнаженность, нарушение авторских прав, демонстрация детской порнографии или жестокого обращения с детьми. Такие действия приведут к блокировке аккаунта.</p>
          </div>
        </div>
      </div>

      {/* Нижняя панель с чатом */}
      <div className="stream-bottom-panel">
        <div className="chat-input-section">
          {isAuthenticated ? (
            <form onSubmit={handleBottomChatSend} className="chat-input-form-bottom">
              <input 
                type="text" 
                placeholder="Общаться со всеми" 
                className="chat-input-field"
                value={bottomChatInput}
                onChange={(e) => setBottomChatInput(e.target.value)}
                maxLength={500}
              />
              <button type="submit" className="send-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </form>
          ) : (
            <div className="chat-login-prompt-bottom">
              <input 
                type="text" 
                placeholder="Общаться со всеми" 
                className="chat-input-field"
                disabled
              />
              <button 
                className="send-button" 
                onClick={() => router.push('/login')}
              >
                Войти для чата
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Баннер с рекламой */}
      {showBanner && (
        <div className="recruitment-banner">
          <div className="banner-content">
            <div className="banner-mascot">🎥</div>
            <div className="banner-text">
              <p className="banner-title">Набор ведущих и агентов NIO открыт!</p>
              <p className="banner-subtitle">Безграничные возможности, высокий доход</p>
            </div>
            <button className="banner-join-button">Присоединиться сейчас</button>
            <button className="banner-close" onClick={() => setShowBanner(false)}>×</button>
          </div>
        </div>
      )}

      {/* Боковая панель с чатом и подарками */}
      <div className="stream-sidebar">
        {isAuthenticated && <GiftPanel streamId={id} user={user} />}
        <Chat streamId={id} user={user} />
      </div>

      {/* Плавающие кнопки */}
      <div className="floating-buttons">
        <button className="floating-button" title="Мобильное приложение">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
          </svg>
        </button>
        <button className="floating-button" title="В избранное">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .nio-stream-page {
          background: #fff;
          min-height: 100vh;
          position: relative;
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .stream-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 20px;
        }

        .streamer-profile {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .streamer-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .streamer-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          font-size: 24px;
          font-weight: bold;
          color: #fff;
        }

        .streamer-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .streamer-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .streamer-name {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .online-indicator {
          color: #22c55e;
          font-size: 12px;
        }

        .streamer-id {
          font-size: 12px;
          color: #666;
        }

        .streamer-stats {
          display: flex;
          gap: 20px;
          margin-left: 20px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .stat-icon {
          font-size: 18px;
        }

        .stat-value {
          font-weight: 600;
          color: #333;
        }

        .stream-actions {
          display: flex;
          gap: 10px;
        }

        .share-button,
        .subscribe-button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .share-button {
          background: #f5f5f5;
          color: #333;
        }

        .share-button:hover {
          background: #e0e0e0;
        }

        .subscribe-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .subscribe-button.subscribed {
          background: #22c55e;
        }

        .subscribe-button:hover {
          opacity: 0.9;
        }

        .stream-main-content {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 20px;
          margin-bottom: 20px;
          align-items: start;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        .stream-video-section {
          display: flex;
          flex-direction: column;
          position: relative;
          padding: 20px;
        }
        
        /* Псевдоэлемент для фона на всю ширину экрана */
        .stream-video-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          width: 100vw;
          height: 100%;
          margin-left: calc(-50vw + 50%);
          margin-right: calc(-50vw + 50%);
          background-image: url('/bg1.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: -1;
          pointer-events: none;
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 15px;
          aspect-ratio: 16 / 9;
          min-height: 500px;
        }
        
        .video-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        /* Скрываем любые overlay с ID и логотипом - универсальные правила */
        .video-wrapper div[class*="video-overlay-gradient"],
        .video-wrapper div[class*="overlay-content"],
        .video-wrapper img[class*="nio-logo-img"],
        .video-wrapper div[class*="stream-id-overlay"],
        .video-wrapper div[class*="stream-info-overlay"],
        .video-wrapper .stream-info-overlay,
        .video-wrapper .streamer-id,
        .video-wrapper .video-overlay-gradient,
        .video-wrapper .overlay-content,
        .video-wrapper .nio-logo-img,
        .video-wrapper .stream-id-overlay {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -9999px !important;
          width: 0 !important;
          height: 0 !important;
        }

        .stream-welcome {
          text-align: center;
          padding: 15px;
          color: #666;
          font-size: 16px;
        }

        .stream-rules-warning {
          background: rgba(255, 243, 205, 0.9);
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        .stream-rules-warning p {
          margin: 5px 0;
          font-size: 13px;
          color: #856404;
          line-height: 1.5;
        }

        .stream-bottom-panel {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .chat-input-section {
          display: flex;
          gap: 10px;
        }

        .chat-input-field {
          flex: 1;
          padding: 12px 15px;
          border: 1px solid #e0e0e0;
          border-radius: 25px;
          font-size: 14px;
          outline: none;
        }

        .chat-input-field:focus {
          border-color: #667eea;
        }

        .chat-input-form-bottom {
          display: flex;
          gap: 10px;
          width: 100%;
          position: relative;
          z-index: 1;
        }
        
        .chat-input-form-bottom:focus-within {
          outline: none;
        }

        .chat-login-prompt-bottom {
          display: flex;
          gap: 10px;
          width: 100%;
        }

        .send-button {
          padding: 12px 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .send-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .recruitment-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          position: relative;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .banner-mascot {
          font-size: 40px;
        }

        .banner-text {
          flex: 1;
        }

        .banner-title {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 5px;
        }

        .banner-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
        }

        .banner-join-button {
          padding: 12px 30px;
          background: #fff;
          color: #667eea;
          border: none;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .banner-join-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .banner-close {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 30px;
          height: 30px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .stream-sidebar {
          position: absolute;
          right: 20px;
          top: 120px;
          width: 350px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: calc(100vh - 200px);
          max-height: calc(100vh - 200px);
        }
        
        .stream-sidebar > *:not(:last-child) {
          flex-shrink: 0;
        }
        
        .stream-sidebar > *:last-child {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .floating-buttons {
          position: fixed;
          bottom: 30px;
          right: 30px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          z-index: 1000;
        }

        .floating-button {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(102, 126, 234, 0.9);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s;
        }

        .floating-button:hover {
          transform: scale(1.1);
          background: rgba(102, 126, 234, 1);
        }

        @media (max-width: 1200px) {
          .stream-main-content {
            grid-template-columns: 1fr;
          }

          .stream-sidebar {
            position: relative;
            right: auto;
            top: auto;
            width: 100%;
            height: auto;
            max-height: none;
          }
        }

        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }

          .nio-stream-page {
            padding: 10px;
          }

          .stream-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
            padding: 15px;
          }

          .streamer-profile {
            width: 100%;
            flex-wrap: wrap;
          }

          .streamer-stats {
            margin-left: 0;
            width: 100%;
            justify-content: space-around;
          }

          .stream-actions {
            width: 100%;
            flex-direction: column;
          }

          .share-button,
          .subscribe-button {
            width: 100%;
            justify-content: center;
          }

          .video-wrapper {
            min-height: 250px;
            aspect-ratio: 9 / 16;
          }

          .stream-main-content {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .stream-sidebar {
            position: relative;
            right: auto;
            top: auto;
            width: 100%;
            height: auto;
            max-height: none;
          }

          .stream-bottom-panel {
            padding: 10px;
          }

          .chat-input-field {
            font-size: 16px; /* Предотвращает зум на iOS */
          }

          .floating-buttons {
            bottom: 20px;
            right: 20px;
          }

          .floating-button {
            width: 45px;
            height: 45px;
          }
        }
      `}</style>
      </div>
    </>
  );
}

