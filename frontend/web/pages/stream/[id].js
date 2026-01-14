import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import StreamPlayer from '../../../components/StreamPlayer';
import Chat from '../../../components/Chat';
import GiftPanel from '../../../components/GiftPanel';

export default function StreamPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStream();
    }
  }, [id]);

  const fetchStream = async () => {
    try {
      const response = await axios.get(
        `${process.env.API_URL || 'http://localhost:5000'}/api/streams/${id}`
      );
      setStream(response.data.stream);
    } catch (error) {
      console.error('Ошибка загрузки стрима:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container">Загрузка...</div>;
  }

  if (!stream) {
    return <div className="container">Стрим не найден</div>;
  }

  return (
    <div className="stream-page">
      <div className="stream-container">
        <StreamPlayer stream={stream} user={user} />
        <div className="stream-info">
          <h2>{stream.title}</h2>
          <p>Стример: {stream.streamer?.nickname}</p>
          <p>Зрителей: {stream.viewerCount}</p>
        </div>
      </div>
      <div className="sidebar">
        {isAuthenticated && <GiftPanel streamId={id} user={user} />}
        <Chat streamId={id} user={user} />
      </div>
    </div>
  );
}

