import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function Chat({ streamId, user }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isAuthenticated = !!user;

  useEffect(() => {
    if (!streamId) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;

    // Присоединяемся к чату стрима (все могут читать, но только авторизованные могут писать)
    socket.emit('join-stream-chat', {
      streamId,
      userId: isAuthenticated ? user.id : `guest-${socket.id}`,
      nickname: isAuthenticated ? user.nickname : 'Гость'
    });

    // Слушаем новые сообщения
    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Слушаем реакции
    socket.on('receive-reaction', (reaction) => {
      // Можно добавить визуальное отображение реакций
      console.log('Реакция:', reaction);
    });

    return () => {
      socket.disconnect();
    };
  }, [streamId, user?.id, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current || !isAuthenticated) return;

    socketRef.current.emit('send-message', {
      streamId,
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  const sendReaction = (reaction) => {
    if (!socketRef.current || !isAuthenticated) return;
    socketRef.current.emit('send-reaction', {
      streamId,
      userId: user.id,
      nickname: user.nickname,
      reaction
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className="chat-message">
            <span className="chat-nickname">{msg.nickname}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isAuthenticated && (
        <>
          <div className="chat-reactions">
            {['❤️', '👍', '🔥', '🎉', '😍'].map(emoji => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="reaction-button"
              >
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={sendMessage} className="chat-input-form">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Введите сообщение..."
              maxLength={500}
            />
            <button type="submit">Отправить</button>
          </form>
        </>
      )}
      {!isAuthenticated && (
        <div className="chat-login-prompt">
          <p>Войдите, чтобы писать в чат</p>
          <a href="/login">Войти</a>
        </div>
      )}
    </div>
  );
}

