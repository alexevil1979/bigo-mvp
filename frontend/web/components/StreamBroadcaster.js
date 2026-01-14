import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Chat from './Chat';

export default function StreamBroadcaster({ stream, user }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const router = useRouter();
  const { token } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    if (stream) {
      startStreaming();
    }

    return () => {
      // Очищаем интервал heartbeat при размонтировании
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [stream]);

  const startStreaming = async () => {
    try {
      // Проверяем, есть ли уже активный поток (при восстановлении после перезагрузки)
      if (!localStreamRef.current) {
        // Получаем доступ к камере и микрофону
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = mediaStream;
      }
      
      // Восстанавливаем отображение потока
      if (videoRef.current && localStreamRef.current) {
        videoRef.current.srcObject = localStreamRef.current;
      }

      // Подключаемся к Socket.IO (если еще не подключены)
      if (!socketRef.current) {
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
        socketRef.current = socket;

        // Слушаем новых зрителей
        socket.on('viewer-joined', async (data) => {
          console.log('Новый зритель присоединился:', data.viewerId);
          // Очищаем старое соединение, если оно существует (при переподключении)
          if (peerConnectionsRef.current[data.viewerId]) {
            console.log('Очищаю старое соединение для зрителя:', data.viewerId);
            const oldPc = peerConnectionsRef.current[data.viewerId];
            if (oldPc._answerHandler && socket) {
              socket.off('webrtc-answer', oldPc._answerHandler);
            }
            if (oldPc._iceHandler && socket) {
              socket.off('webrtc-ice-candidate', oldPc._iceHandler);
            }
            oldPc.close();
            delete peerConnectionsRef.current[data.viewerId];
          }
          await handleNewViewer(data.viewerId, socket, stream._id);
        });

        // Слушаем отключение зрителей
        socket.on('user-disconnected', (data) => {
          if (data.userId && peerConnectionsRef.current[data.userId]) {
            console.log('Зритель отключился, очищаю соединение:', data.userId);
            const pc = peerConnectionsRef.current[data.userId];
            if (pc._answerHandler && socket) {
              socket.off('webrtc-answer', pc._answerHandler);
            }
            if (pc._iceHandler && socket) {
              socket.off('webrtc-ice-candidate', pc._iceHandler);
            }
            pc.close();
            delete peerConnectionsRef.current[data.userId];
            setViewerCount(Object.keys(peerConnectionsRef.current).length);
          }
        });
      }

      // Присоединяемся как стример (даже если уже подключены)
      socketRef.current.emit('join-stream', {
        streamId: stream._id,
        userId: user.id,
        isStreamer: true
      });

      // Присоединяемся к чату стрима
      socketRef.current.emit('join-stream-chat', {
        streamId: stream._id,
        userId: user.id,
        nickname: user.nickname
      });

      // Начинаем отправку heartbeat каждые 10 секунд
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('stream-heartbeat', {
            streamId: stream._id
          });
        }
      }, 10 * 1000); // Каждые 10 секунд

      // Отправляем первый heartbeat сразу
      socketRef.current.emit('stream-heartbeat', {
        streamId: stream._id
      });

      setIsStreaming(true);
    } catch (error) {
      console.error('Ошибка запуска стрима:', error);
      alert('Не удалось получить доступ к камере/микрофону');
    }
  };

  const handleNewViewer = async (viewerId, socket, streamId) => {
    try {
      // Проверяем, нет ли уже соединения с этим зрителем
      if (peerConnectionsRef.current[viewerId]) {
        console.log('Соединение с зрителем уже существует:', viewerId);
        return;
      }

      console.log('Создаю peer connection для зрителя:', viewerId);
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Добавляем локальный поток
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            pc.addTrack(track, localStreamRef.current);
          }
        });
      }

      // Обработка ICE кандидатов (до создания offer)
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            streamId: streamId,
            candidate: event.candidate,
            targetId: viewerId
          });
        }
      };

      // Слушаем answer для этого конкретного зрителя
      const answerHandler = async (data) => {
        if (data.senderId === viewerId && data.streamId === streamId) {
          console.log('Получен answer от зрителя:', viewerId);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            socket.off('webrtc-answer', answerHandler);
          } catch (error) {
            console.error('Ошибка установки remote description:', error);
          }
        }
      };
      socket.on('webrtc-answer', answerHandler);

      // Слушаем ICE кандидаты от зрителя
      const iceHandler = async (data) => {
        if (data.senderId === viewerId && data.streamId === streamId) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error('Ошибка добавления ICE candidate:', error);
          }
        }
      };
      socket.on('webrtc-ice-candidate', iceHandler);

      // Создаем offer
      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });
      await pc.setLocalDescription(offer);

      // Отправляем offer зрителю
      console.log('Отправляю offer зрителю:', viewerId);
      socket.emit('webrtc-offer', {
        streamId: streamId,
        offer: offer,
        targetId: viewerId
      });

      // Сохраняем обработчики для очистки
      pc._answerHandler = answerHandler;
      pc._iceHandler = iceHandler;
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
      localStreamRef.current = null;
    }

    // Закрываем все peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => {
      if (pc._answerHandler && socketRef.current) {
        socketRef.current.off('webrtc-answer', pc._answerHandler);
      }
      if (pc._iceHandler && socketRef.current) {
        socketRef.current.off('webrtc-ice-candidate', pc._iceHandler);
      }
      pc.close();
    });
    peerConnectionsRef.current = {};

    // Останавливаем heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Отключаемся от Socket.IO
    if (socketRef.current) {
      socketRef.current.emit('leave-stream', { streamId: stream._id });
      socketRef.current.disconnect();
      socketRef.current = null;
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
    <div className="broadcaster-page">
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
      <div className="broadcaster-sidebar">
        <Chat streamId={stream._id} user={user} />
      </div>
    </div>
  );
}

