import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import StreamCard from './StreamCard';

export default function StreamEnded({ stream }) {
  const [recommendedStreams, setRecommendedStreams] = useState([]);

  const fetchRecommendedStreams = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams`
      );
      const activeStreams = (response.data.streams || [])
        .filter(s => s.status === 'live' && s._id !== stream?._id)
        .slice(0, 3);
      setRecommendedStreams(activeStreams);
    } catch (error) {
      console.error('Ошибка загрузки рекомендуемых стримов:', error);
    }
  };

  useEffect(() => {
    fetchRecommendedStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stream-ended-page">
      <div className="stream-ended-container">
        <div className="ended-icon">📺</div>
        <h1>Эфир завершен</h1>
        {stream && (
          <div className="ended-stats">
            <p>Зрителей: {stream.viewerCount || 0}</p>
          </div>
        )}
        
        {recommendedStreams.length > 0 && (
          <div className="recommended-streams">
            <h2>Рекомендуемые стримы</h2>
            <div className="streams-grid">
              {recommendedStreams.map(stream => (
                <StreamCard key={stream._id} stream={stream} />
              ))}
            </div>
          </div>
        )}

        <Link href="/" className="back-button">
          Вернуться на главную
        </Link>
      </div>

      <style jsx>{`
        .stream-ended-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .stream-ended-container {
          background: #fff;
          border-radius: 12px;
          padding: 60px 40px;
          text-align: center;
          max-width: 600px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .ended-icon {
          font-size: 80px;
          margin-bottom: 20px;
        }

        .ended-container h1 {
          font-size: 32px;
          color: #333;
          margin-bottom: 20px;
        }

        .ended-stats {
          margin: 20px 0;
          color: #666;
        }

        .recommended-streams {
          margin-top: 40px;
          text-align: left;
        }

        .recommended-streams h2 {
          font-size: 20px;
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }

        .streams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .back-button {
          display: inline-block;
          padding: 15px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 600;
          transition: all 0.3s;
          margin-top: 20px;
        }

        .back-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
      `}</style>
    </div>
  );
}
