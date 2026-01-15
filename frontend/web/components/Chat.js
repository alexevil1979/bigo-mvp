import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function Chat({ streamId, user }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [reactions, setReactions] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
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

  // Автоскролл только контейнера чата, не всей страницы
  useEffect(() => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      // Скроллим только если пользователь уже был внизу чата
      if (isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Предотвращаем всплытие события
    if (!inputMessage.trim() || !socketRef.current || !isAuthenticated) return;

    socketRef.current.emit('send-message', {
      streamId,
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      message: inputMessage.trim(),
      replyTo: replyingTo ? replyingTo.userId : null,
      replyToNickname: replyingTo ? replyingTo.nickname : null
    });

    setInputMessage('');
    setReplyingTo(null);
    
    // Скроллим контейнер чата вниз после отправки
    setTimeout(() => {
      if (messagesContainerRef.current && messagesEndRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleReply = (message) => {
    setReplyingTo({
      userId: message.userId,
      nickname: message.nickname
    });
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
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((msg, index) => (
          <div 
            key={msg.id || index} 
            className="chat-message"
          >
            {msg.replyToNickname && (
              <div className="reply-indicator">
                ↳ Ответ {msg.replyToNickname}
              </div>
            )}
            <span 
              className="chat-nickname"
              onClick={() => handleReply(msg)}
              style={{ cursor: 'pointer' }}
              title="Ответить"
            >
              {msg.nickname}:
            </span>
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
          {replyingTo && (
            <div className="reply-preview">
              <span>Ответ {replyingTo.nickname}:</span>
              <button 
                type="button"
                onClick={() => setReplyingTo(null)}
                className="reply-cancel"
              >
                ×
              </button>
            </div>
          )}
          <form onSubmit={sendMessage} className="chat-input-form">
            <div className="chat-input-wrapper">
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
                          onClick={() => {
                            setInputMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
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
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={replyingTo ? `Ответить ${replyingTo.nickname}...` : "Введите сообщение..."}
                maxLength={500}
                className="chat-input-with-emoji"
              />
              <button type="submit" className="send-button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
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
          min-height: 0;
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 15px;
          background: #0f0f0f;
          scroll-behavior: smooth;
        }

        .chat-message {
          margin-bottom: 10px;
          padding: 8px;
          background: #1a1a1a;
          border-radius: 6px;
          word-wrap: break-word;
        }

        .reply-indicator {
          font-size: 11px;
          color: #6366f1;
          margin-bottom: 4px;
          font-style: italic;
        }

        .chat-nickname {
          cursor: pointer;
          transition: color 0.2s;
        }

        .chat-nickname:hover {
          color: #6366f1;
        }

        .reply-preview {
          padding: 8px 15px;
          background: #2a2a2a;
          border-top: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #6366f1;
        }

        .reply-cancel {
          background: transparent;
          border: none;
          color: #aaa;
          cursor: pointer;
          font-size: 18px;
          padding: 0 5px;
        }

        .reply-cancel:hover {
          color: #fff;
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
          padding: 8px;
          background: #1a1a1a;
          border-top: 1px solid #333;
          position: relative;
          z-index: 1;
        }

        .chat-input-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          box-sizing: border-box;
        }

        .chat-input-with-emoji {
          flex: 1;
          padding: 8px 12px;
          background: #0f0f0f;
          border: 1px solid #333;
          border-radius: 20px;
          color: #e0e0e0;
          font-size: 14px;
          outline: none;
          min-width: 0;
        }

        .chat-input-with-emoji:focus {
          border-color: #6366f1;
        }

        .emoji-picker-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .emoji-toggle-button {
          background: transparent;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
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
          padding: 8px 12px;
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 36px;
          height: 36px;
        }

        .send-button:hover {
          background: #4f46e5;
        }

        .send-button svg {
          width: 18px;
          height: 18px;
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

