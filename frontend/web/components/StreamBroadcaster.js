import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function StreamBroadcaster({ stream, user }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const router = useRouter();
  const { token } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    startStreaming();

    return () => {
      stopStreaming();
    };
  }, [stream]);

  const startStreaming = async () => {
    try {
      // Получаем доступ к камере и микрофону
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Подключаемся к Socket.IO
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
      socketRef.current = socket;

      // Присоединяемся как стример
      socket.emit('join-stream', {
        streamId: stream._id,
        userId: user.id,
        isStreamer: true
      });

      // Слушаем новых зрителей
      socket.on('viewer-joined', async (data) => {
        await handleNewViewer(data.viewerId, socket);
      });

      setIsStreaming(true);
    } catch (error) {
      console.error('Ошибка запуска стрима:', error);
      alert('Не удалось получить доступ к камере/микрофону');
    }
  };

  const handleNewViewer = async (viewerId, socket) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Добавляем локальный поток
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });

      // Создаем offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Отправляем offer зрителю
      socket.emit('webrtc-offer', {
        streamId: stream._id,
        offer: offer,
        targetId: viewerId
      });

      // Слушаем answer
      socket.on('webrtc-answer', async (data) => {
        if (data.senderId === viewerId && data.streamId === stream._id) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      // Обработка ICE кандидатов
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            streamId: stream._id,
            candidate: event.candidate,
            targetId: viewerId
          });
        }
      };

      socket.on('webrtc-ice-candidate', async (data) => {
        if (data.senderId === viewerId && data.streamId === stream._id) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      peerConnectionsRef.current[viewerId] = pc;

      // Обновляем количество зрителей
      setViewerCount(Object.keys(peerConnectionsRef.current).length);
    } catch (error) {
      console.error('Ошибка подключения зрителя:', error);
    }
  };

  const stopStreaming = async () => {
    // Останавливаем все треки
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Закрываем все peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    // Отключаемся от Socket.IO
    if (socketRef.current) {
      socketRef.current.emit('leave-stream', { streamId: stream._id });
      socketRef.current.disconnect();
    }

    // Завершаем стрим на сервере
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/${stream._id}/end`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (error) {
      console.error('Ошибка завершения стрима:', error);
    }

    setIsStreaming(false);
    router.push('/');
  };

  return (
    <div className="broadcaster-container">
      <div className="broadcaster-header">
        <h2>{stream.title}</h2>
        <div className="stream-stats">
          <span>👁️ {viewerCount} зрителей</span>
          <button onClick={stopStreaming} className="stop-button">
            Завершить стрим
          </button>
        </div>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="broadcaster-video"
      />
      {!isStreaming && <div className="loading">Запуск стрима...</div>}
    </div>
  );
}

