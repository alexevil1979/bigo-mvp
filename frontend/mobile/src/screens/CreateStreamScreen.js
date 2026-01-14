import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function CreateStreamScreen({ navigation }) {
  const { user, token, API_URL } = useAuth();
  const [title, setTitle] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const startStream = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название стрима');
      return;
    }

    try {
      // Получаем доступ к камере
      const stream = await mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);

      // Создаем стрим на сервере
      const response = await axios.post(
        `${API_URL}/api/streams`,
        { title, category: 'other' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStream(response.data.stream);

      // Подключаемся к Socket.IO
      const socket = io(API_URL);
      socketRef.current = socket;

      socket.emit('join-stream', {
        streamId: response.data.stream._id,
        userId: user.id,
        isStreamer: true
      });

      socket.on('viewer-joined', async (data) => {
        await handleNewViewer(data.viewerId, socket, response.data.stream._id);
      });

      setIsStreaming(true);
    } catch (error) {
      console.error('Ошибка запуска стрима:', error);
      Alert.alert('Ошибка', 'Не удалось запустить стрим');
    }
  };

  const handleNewViewer = async (viewerId, socket, streamId) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc-offer', {
        streamId,
        offer: offer,
        targetId: viewerId
      });

      socket.on('webrtc-answer', async (data) => {
        if (data.senderId === viewerId) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            streamId,
            candidate: event.candidate,
            targetId: viewerId
          });
        }
      };

      peerConnectionsRef.current[viewerId] = pc;
    } catch (error) {
      console.error('Ошибка подключения зрителя:', error);
    }
  };

  const stopStream = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    if (socketRef.current) {
      if (stream) {
        socketRef.current.emit('leave-stream', { streamId: stream._id });
      }
      socketRef.current.disconnect();
    }

    if (stream) {
      try {
        await axios.post(
          `${API_URL}/api/streams/${stream._id}/end`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Ошибка завершения стрима:', error);
      }
    }

    setIsStreaming(false);
    navigation.goBack();
  };

  if (isStreaming && localStream) {
    return (
      <View style={styles.container}>
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.video}
          objectFit="cover"
          mirror={true}
        />
        <View style={styles.controls}>
          <Text style={styles.streamTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopStream}
          >
            <Text style={styles.stopButtonText}>Завершить стрим</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Создать стрим</Text>
      <TextInput
        style={styles.input}
        placeholder="Название стрима"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#888"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={startStream}
      >
        <Text style={styles.buttonText}>Начать стрим</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  video: {
    flex: 1,
    width: '100%'
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15
  },
  streamTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  stopButton: {
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

