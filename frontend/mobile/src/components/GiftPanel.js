import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
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
  const { API_URL } = useAuth();
  const [userCoins, setUserCoins] = useState(user?.coins || 0);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;

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
      Alert.alert('Ошибка', 'Недостаточно монет');
      return;
    }

    try {
      const streamResponse = await axios.get(`${API_URL}/api/streams/${streamId}`);
      const recipientId = streamResponse.data.stream.streamer._id;

      socketRef.current.emit('send-gift', {
        streamId,
        senderId: user.id,
        recipientId,
        giftType
      });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить подарок');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Подарки</Text>
      <Text style={styles.balance}>Монеты: {userCoins}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Object.entries(GIFT_TYPES).map(([key, gift]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.giftButton,
              userCoins < gift.cost && styles.giftButtonDisabled
            ]}
            onPress={() => sendGift(key)}
            disabled={userCoins < gift.cost}
          >
            <Text style={styles.giftEmoji}>{gift.emoji}</Text>
            <Text style={styles.giftName}>{gift.name}</Text>
            <Text style={styles.giftCost}>{gift.cost}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  balance: {
    color: '#6366f1',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 4
  },
  giftButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#444'
  },
  giftButtonDisabled: {
    opacity: 0.5
  },
  giftEmoji: {
    fontSize: 30,
    marginBottom: 5
  },
  giftName: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 5
  },
  giftCost: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 'bold'
  }
});

