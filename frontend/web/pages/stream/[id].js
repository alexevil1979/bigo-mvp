import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import StreamPlayer from '../../components/StreamPlayer';
import StreamBroadcaster from '../../components/StreamBroadcaster';
import Chat from '../../components/Chat';
import GiftPanel from '../../components/GiftPanel';

export default function StreamPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated, token } = useAuth();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStreamer, setIsStreamer] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStream();
    }
  }, [id, user?.id]);

  const fetchStream = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/${id}`
      );
      const streamData = response.data.stream;
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
      console.error('Ошибка загрузки стрима:', error);
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

  if (loading) {
    return <div className="container">Загрузка...</div>;
  }

  if (!stream) {
    return <div className="container">Стрим не найден</div>;
  }

  // Если пользователь - стример, показываем страницу стримера
  if (isStreamer && isAuthenticated) {
    return <StreamBroadcaster stream={stream} user={user} />;
  }

  return (
    <div className="stream-page">
      <div className="stream-container">
        <StreamPlayer stream={stream} user={user} />
        <div className="stream-info">
          <h2>{stream.title}</h2>
          <p>Стример: {stream.streamer?.nickname}</p>
          <p>Зрителей: {stream.viewerCount}</p>
          {isStreamer && isAuthenticated && (
            <div className="streamer-controls">
              <button onClick={() => router.push(`/stream/create`)} className="continue-button">
                Продолжить стрим
              </button>
              <button onClick={handleEndStream} className="end-button">
                Остановить стрим
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="sidebar">
        {isAuthenticated && <GiftPanel streamId={id} user={user} />}
        <Chat streamId={id} user={user} />
      </div>
      <style jsx>{`
        .streamer-controls {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        .continue-button,
        .end-button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .continue-button {
          background: #6366f1;
          color: #fff;
        }

        .continue-button:hover {
          background: #4f46e5;
        }

        .end-button {
          background: #dc2626;
          color: #fff;
        }

        .end-button:hover {
          background: #b91c1c;
        }
      `}</style>
    </div>
  );
}

