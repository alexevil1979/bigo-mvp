import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function Chat({ streamId, user }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!streamId || !user) return;

    const socket = io(process.env.SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;

    // Присоединяемся к чату стрима
    socket.emit('join-stream-chat', {
      streamId,
      userId: user.id,
      nickname: user.nickname
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
  }, [streamId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;

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
    if (!socketRef.current) return;
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
    </div>
  );
}

