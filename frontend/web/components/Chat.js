import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function Chat({ streamId, user }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [reactions, setReactions] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const isAuthenticated = !!user;

  // Расширенный список эмодзи
  const emojis = [
    '❤️', '👍', '👎', '🔥', '🎉', '😍', '😂', '😮', '😢', '😡',
    '👏', '🙌', '💪', '🎊', '⭐', '💯', '🎈', '🎁', '🏆', '👑',
    '💎', '🌟', '✨', '💖', '💕', '💗', '💓', '💝', '🎯', '🚀',
    '💥', '⚡', '🌈', '☀️', '🌙', '⭐', '🌠', '🎆', '🎇', '🎊'
  ];

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
      console.log('Получена реакция:', reaction);
      setReactions(prev => [...prev, reaction]);
      // Удаляем реакцию через 3 секунды для анимации
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r !== reaction));
      }, 3000);
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
    console.log('Отправляю реакцию:', reaction);
    socketRef.current.emit('send-reaction', {
      streamId,
      userId: user.id,
      nickname: user.nickname,
      reaction
    });
    setShowEmojiPicker(false);
  };

  // Закрытие эмодзи-пикера при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className="chat-message">
            <span className="chat-nickname">{msg.nickname}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
        {/* Отображение реакций как сообщений */}
        {reactions.map((reaction, index) => (
          <div key={`reaction-${index}-${reaction.timestamp}`} className="chat-reaction-message">
            <span className="reaction-emoji-large">{reaction.reaction}</span>
            <span className="reaction-nickname">{reaction.nickname}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isAuthenticated && (
        <>
          <form onSubmit={sendMessage} className="chat-input-form">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Введите сообщение..."
              maxLength={500}
            />
            <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="emoji-toggle-button"
                title="Эмодзи"
              >
                😀
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker">
                  <div className="emoji-grid">
                    {emojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => sendReaction(emoji)}
                        className="emoji-button"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="submit" className="send-button">Отправить</button>
          </form>
        </>
      )}
      {!isAuthenticated && (
        <div className="chat-login-prompt">
          <p>Войдите, чтобы писать в чат</p>
          <a href="/login">Войти</a>
        </div>
      )}
      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          background: #0f0f0f;
        }

        .chat-message {
          margin-bottom: 10px;
          padding: 8px;
          background: #1a1a1a;
          border-radius: 6px;
          word-wrap: break-word;
        }

        .chat-nickname {
          color: #6366f1;
          font-weight: 600;
          margin-right: 8px;
        }

        .chat-text {
          color: #e0e0e0;
        }

        .chat-reaction-message {
          margin-bottom: 8px;
          padding: 8px 12px;
          background: rgba(99, 102, 241, 0.1);
          border-left: 3px solid #6366f1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: slideIn 0.3s ease-out;
        }

        .reaction-emoji-large {
          font-size: 28px;
        }

        .reaction-nickname {
          color: #6366f1;
          font-weight: 600;
          font-size: 14px;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .chat-input-form {
          display: flex;
          align-items: center;
          padding: 10px;
          background: #1a1a1a;
          border-top: 1px solid #333;
          gap: 8px;
        }

        .chat-input-form input {
          flex: 1;
          padding: 10px 15px;
          background: #0f0f0f;
          border: 1px solid #333;
          border-radius: 20px;
          color: #e0e0e0;
          font-size: 14px;
          outline: none;
        }

        .chat-input-form input:focus {
          border-color: #6366f1;
        }

        .emoji-picker-wrapper {
          position: relative;
        }

        .emoji-toggle-button {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .emoji-toggle-button:hover {
          background: #2a2a2a;
        }

        .emoji-picker {
          position: absolute;
          bottom: 100%;
          right: 0;
          margin-bottom: 10px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 10px;
          max-width: 300px;
          max-height: 250px;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          z-index: 1000;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 5px;
        }

        .emoji-button {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 5px;
          border-radius: 6px;
          transition: background 0.2s, transform 0.1s;
        }

        .emoji-button:hover {
          background: #2a2a2a;
          transform: scale(1.2);
        }

        .send-button {
          padding: 10px 20px;
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .send-button:hover {
          background: #4f46e5;
        }

        .chat-login-prompt {
          padding: 15px;
          text-align: center;
          background: #1a1a1a;
          border-top: 1px solid #333;
        }

        .chat-login-prompt p {
          color: #aaa;
          margin-bottom: 10px;
        }

        .chat-login-prompt a {
          color: #6366f1;
          text-decoration: none;
        }

        .chat-login-prompt a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

