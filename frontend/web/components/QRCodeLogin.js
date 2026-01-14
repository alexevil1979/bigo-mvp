import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// Увеличиваем таймаут для axios по умолчанию
axios.defaults.timeout = 30000; // 30 секунд

/**
 * Компонент QR-кода для входа через мобильное приложение
 * 
 * Функционал:
 * 1. Генерирует уникальный QR-код при загрузке
 * 2. Создает временную сессию для входа через QR
 * 3. Слушает события от мобильного приложения через Socket.IO
 * 4. При сканировании QR-кода мобильным приложением автоматически авторизует пользователя
 * 5. Обновляет QR-код каждые 60 секунд для безопасности
 */
export default function QRCodeLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [qrCode, setQrCode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting, scanning, success, error
  const socketRef = useRef(null);
  const qrIntervalRef = useRef(null);

  useEffect(() => {
    // Генерируем QR-код при загрузке
    generateQRCode();

    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (qrIntervalRef.current) {
        clearInterval(qrIntervalRef.current);
      }
    };
  }, []);

  const generateQRCode = async () => {
    try {
      // Создаем сессию для QR-кода
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/qr-session`
      );

      const { sessionId: newSessionId, qrData } = response.data;
      setSessionId(newSessionId);
      setQrCode(qrData);

      // Подключаемся к Socket.IO для получения уведомлений
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
      socketRef.current = socket;

      // Слушаем событие успешного сканирования
      socket.on(`qr-login-${newSessionId}`, async (data) => {
        if (data.token && data.user) {
          setStatus('success');
          login(data.token, data.user);
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }
      });

      // Обновляем QR-код каждые 60 секунд
      qrIntervalRef.current = setInterval(() => {
        generateQRCode();
      }, 60000);

      setStatus('waiting');
    } catch (error) {
      console.error('Ошибка генерации QR-кода:', error);
      setStatus('error');
    }
  };

  return (
    <div className="qr-login-container">
      <h2>Отсканируйте код чтобы войти</h2>
      <div className="qr-code-wrapper">
        {qrCode ? (
          <div className="qr-code">
            <img src={qrCode} alt="QR Code" />
            {status === 'waiting' && (
              <div className="qr-status">
                <div className="qr-loading"></div>
                <p>Ожидание сканирования...</p>
              </div>
            )}
            {status === 'scanning' && (
              <div className="qr-status success">
                <p>✓ Код отсканирован</p>
              </div>
            )}
            {status === 'success' && (
              <div className="qr-status success">
                <p>✓ Вход выполнен!</p>
              </div>
            )}
            {status === 'error' && (
              <div className="qr-status error">
                <p>Ошибка. Обновите страницу</p>
              </div>
            )}
          </div>
        ) : (
          <div className="qr-loading-placeholder">
            <div className="loading-spinner"></div>
            <p>Генерация QR-кода...</p>
          </div>
        )}
      </div>
      <div className="qr-instructions">
        <p>1. Откройте приложение NIO</p>
        <p>2. Найдите "Сканировать QR-код"</p>
      </div>
      <div className="qr-screenshots">
        <div className="screenshot">
          <div className="screenshot-placeholder">
            <span>📱</span>
            <p>Экран "Me"</p>
          </div>
          <div className="screenshot-hint">Настройки</div>
        </div>
        <div className="screenshot">
          <div className="screenshot-placeholder">
            <span>📱</span>
            <p>Меню</p>
          </div>
          <div className="screenshot-hint">Сканировать QR-код</div>
        </div>
      </div>
      <style jsx>{`
        .qr-login-container {
          text-align: center;
          padding: 40px 20px;
        }

        .qr-login-container h2 {
          font-size: 24px;
          color: #333;
          margin-bottom: 30px;
          font-weight: 600;
        }

        .qr-code-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
        }

        .qr-code {
          position: relative;
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .qr-code img {
          width: 250px;
          height: 250px;
          display: block;
        }

        .qr-status {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .qr-status.success {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .qr-status.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .qr-loading {
          width: 40px;
          height: 40px;
          border: 4px solid #e0e0e0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }

        .qr-loading-placeholder {
          padding: 40px;
        }

        .qr-instructions {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: left;
        }

        .qr-instructions p {
          margin: 10px 0;
          color: #666;
          font-size: 14px;
        }

        .qr-screenshots {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .screenshot {
          position: relative;
          width: 150px;
        }

        .screenshot-placeholder {
          background: #f0f0f0;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          border: 2px dashed #ccc;
        }

        .screenshot-placeholder span {
          font-size: 40px;
          display: block;
          margin-bottom: 10px;
        }

        .screenshot-hint {
          margin-top: 10px;
          padding: 8px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 6px;
          color: #667eea;
          font-size: 12px;
          font-weight: 600;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

