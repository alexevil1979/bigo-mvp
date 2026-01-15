import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import Chat from '../components/Chat';
import GiftPanel from '../components/GiftPanel';
import axios from 'axios';

export default function StreamScreen({ route }) {
  const { streamId } = route.params;
  const { user, API_URL } = useAuth();
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    fetchStream();
    setupWebRTC();

    return () => {
      cleanup();
    };
  }, [streamId]);

  const fetchStream = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/streams/${streamId}`);
      setStream(response.data.stream);
    } catch (error) {
      console.error('Ошибка загрузки стрима:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebRTC = async () => {
    try {
      const socket = io(API_URL);
      socketRef.current = socket;

      // Настройка ICE серверов с TURN, если доступен
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' }
      ];
      
      // Добавляем TURN сервер из переменных окружения, если есть
      // В React Native можно использовать react-native-config или передавать через API
      // Для мобильных устройств TURN критически важен
      if (process.env.WEBRTC_TURN_SERVER) {
        iceServers.push({
          urls: process.env.WEBRTC_TURN_SERVER,
          username: process.env.WEBRTC_TURN_USERNAME || '',
          credential: process.env.WEBRTC_TURN_PASSWORD || ''
        });
      }

      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      // Используем ontrack вместо устаревшего onaddstream
      pc.ontrack = (event) => {
        console.log('Получен трек:', event);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else if (event.track) {
          const stream = new MediaStream([event.track]);
          setRemoteStream(stream);
        }
      };

      // Обработка изменения состояния соединения
      pc.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.error('WebRTC соединение потеряно');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            streamId,
            candidate: event.candidate,
            targetId: stream?.streamer?._id
          });
        }
      };

      socket.emit('join-stream', {
        streamId,
        userId: user?.id,
        isStreamer: false
      });

      socket.on('webrtc-offer', async (data) => {
        if (data.streamId === streamId) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc-answer', {
            streamId,
            answer: answer,
            targetId: data.senderId
          });
        }
      });

      socket.on('webrtc-ice-candidate', async (data) => {
        if (data.streamId === streamId) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });
    } catch (error) {
      console.error('Ошибка WebRTC:', error);
    }
  };

  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.video}
            objectFit="cover"
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Подключение к стриму...</Text>
          </View>
        )}
        <View style={styles.streamInfo}>
          <Text style={styles.title}>{stream?.title}</Text>
          <Text style={styles.streamer}>
            Стример: {stream?.streamer?.nickname}
          </Text>
          <Text style={styles.viewers}>👁️ {stream?.viewerCount} зрителей</Text>
        </View>
      </View>
      
      <ScrollView style={styles.sidebar}>
        <GiftPanel streamId={streamId} user={user} />
        <Chat streamId={streamId} user={user} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a'
  },
  videoContainer: {
    height: 300,
    backgroundColor: '#000'
  },
  video: {
    width: '100%',
    height: '100%'
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#fff',
    marginTop: 10
  },
  streamInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  streamer: {
    color: '#aaa',
    fontSize: 14
  },
  viewers: {
    color: '#888',
    fontSize: 12,
    marginTop: 5
  },
  sidebar: {
    flex: 1
  }
});

