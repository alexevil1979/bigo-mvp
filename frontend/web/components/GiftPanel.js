import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const GIFT_TYPES = {
  rose: { name: 'Роза', emoji: '🌹', cost: 10 },
  heart: { name: 'Сердце', emoji: '❤️', cost: 20 },
  diamond: { name: 'Алмаз', emoji: '💎', cost: 50 },
  rocket: { name: 'Ракета', emoji: '🚀', cost: 100 },
  crown: { name: 'Корона', emoji: '👑', cost: 200 },
  star: { name: 'Звезда', emoji: '⭐', cost: 500 },
  fire: { name: 'Огонь', emoji: '🔥', cost: 1000 },
  rainbow: { name: 'Радуга', emoji: '🌈', cost: 2000 }
};

export default function GiftPanel({ streamId, user }) {
  const [gifts, setGifts] = useState([]);
  const [userCoins, setUserCoins] = useState(user?.coins || 0);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(process.env.SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;

    // Слушаем подарки
    socket.on('receive-gift', (gift) => {
      setGifts(prev => [gift, ...prev.slice(0, 9)]); // Последние 10 подарков
    });

    // Слушаем обновление баланса
    socket.on('balance-updated', (data) => {
      setUserCoins(data.coins);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendGift = async (giftType) => {
    if (!socketRef.current || !user) return;

    const gift = GIFT_TYPES[giftType];
    if (!gift || userCoins < gift.cost) {
      alert('Недостаточно монет');
      return;
    }

    // Получаем информацию о стриме для определения получателя
    try {
      const streamResponse = await axios.get(
        `${process.env.API_URL || 'http://localhost:5000'}/api/streams/${streamId}`
      );
      const recipientId = streamResponse.data.stream.streamer._id;

      socketRef.current.emit('send-gift', {
        streamId,
        senderId: user.id,
        recipientId,
        giftType
      });
    } catch (error) {
      console.error('Ошибка отправки подарка:', error);
      alert('Ошибка отправки подарка');
    }
  };

  return (
    <div className="gift-panel">
      <h3>Подарки</h3>
      <div className="user-balance">Монеты: {userCoins}</div>
      <div className="gifts-grid">
        {Object.entries(GIFT_TYPES).map(([key, gift]) => (
          <button
            key={key}
            onClick={() => sendGift(key)}
            className={`gift-button ${userCoins < gift.cost ? 'disabled' : ''}`}
            disabled={userCoins < gift.cost}
          >
            <span className="gift-emoji">{gift.emoji}</span>
            <span className="gift-name">{gift.name}</span>
            <span className="gift-cost">{gift.cost} монет</span>
          </button>
        ))}
      </div>
      <div className="recent-gifts">
        <h4>Последние подарки</h4>
        {gifts.length === 0 ? (
          <p>Подарков пока нет</p>
        ) : (
          <div className="gifts-list">
            {gifts.map((gift, index) => (
              <div key={index} className="gift-item">
                <span>{GIFT_TYPES[gift.giftType]?.emoji}</span>
                <span>{gift.sender.nickname} → {gift.recipient.nickname}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

