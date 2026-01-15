import { useState, useRef } from 'react';

/**
 * Компонент для выбора заставки (overlay) для стрима
 * 
 * Функционал:
 * - Выбор изображения из файла
 * - Предпросмотр заставки
 * - Включение/выключение заставки
 * - Продолжение трансляции
 */
export default function OverlaySelector({ onOverlayChange, onContinue }) {
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayVideo, setOverlayVideo] = useState(null);
  const [overlayType, setOverlayType] = useState(null); // 'image' or 'video'
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'image') {
        // Проверяем тип файла для изображения
        if (!file.type.startsWith('image/')) {
          alert('Пожалуйста, выберите изображение');
          return;
        }
        // Проверяем размер (макс 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('Размер файла не должен превышать 10MB');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setOverlayImage(event.target.result);
          setOverlayVideo(null);
          setOverlayType('image');
          setOverlayEnabled(true);
          if (onOverlayChange) {
            onOverlayChange(event.target.result, true, 'image');
          }
        };
        reader.readAsDataURL(file);
      } else if (type === 'video') {
        // Проверяем тип файла для видео
        if (!file.type.startsWith('video/')) {
          alert('Пожалуйста, выберите видео файл');
          return;
        }
        // Проверяем размер (макс 50MB)
        if (file.size > 50 * 1024 * 1024) {
          alert('Размер файла не должен превышать 50MB');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setOverlayVideo(event.target.result);
          setOverlayImage(null);
          setOverlayType('video');
          setOverlayEnabled(true);
          if (onOverlayChange) {
            onOverlayChange(event.target.result, true, 'video');
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveOverlay = () => {
    setOverlayImage(null);
    setOverlayVideo(null);
    setOverlayType(null);
    setOverlayEnabled(false);
    setShowOverlay(false);
    if (onOverlayChange) {
      onOverlayChange(null, false, null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleToggleOverlay = () => {
    const newState = !showOverlay;
    setShowOverlay(newState);
    if (onOverlayChange) {
      const overlay = overlayType === 'video' ? overlayVideo : overlayImage;
      if (overlay) {
        onOverlayChange(overlay, newState, overlayType);
      }
    }
  };

  return (
    <div className="overlay-selector">
      <div className="overlay-controls">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="select-overlay-button"
          >
            📷 Изображение
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            className="select-overlay-button"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            🎬 Видео
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e, 'image')}
          style={{ display: 'none' }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => handleFileSelect(e, 'video')}
          style={{ display: 'none' }}
        />
        
        {(overlayImage || overlayVideo) && (
          <>
            <button
              onClick={handleToggleOverlay}
              className={`toggle-overlay-button ${showOverlay ? 'active' : ''}`}
            >
              {showOverlay ? '👁️ Скрыть заставку' : '👁️ Показать заставку'}
            </button>
            <button
              onClick={handleRemoveOverlay}
              className="remove-overlay-button"
            >
              🗑️ Удалить заставку
            </button>
          </>
        )}
        
        <button
          onClick={onContinue}
          className="continue-button"
        >
          ▶️ Продолжить трансляцию
        </button>
      </div>

      {overlayImage && (
        <div className="overlay-preview">
          <img src={overlayImage} alt="Overlay preview" />
        </div>
      )}
      {overlayVideo && (
        <div className="overlay-preview">
          <video src={overlayVideo} autoPlay loop muted style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '2px solid #333' }} />
        </div>
      )}

      <style jsx>{`
        .overlay-selector {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.95);
          padding: 30px;
          border-radius: 12px;
          z-index: 10000;
          min-width: 400px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .overlay-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .select-overlay-button,
        .toggle-overlay-button,
        .remove-overlay-button,
        .continue-button {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .select-overlay-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .select-overlay-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .toggle-overlay-button {
          background: #333;
          color: #fff;
        }

        .toggle-overlay-button.active {
          background: #22c55e;
        }

        .toggle-overlay-button:hover {
          background: #444;
        }

        .remove-overlay-button {
          background: #dc2626;
          color: #fff;
        }

        .remove-overlay-button:hover {
          background: #b91c1c;
        }

        .continue-button {
          background: #22c55e;
          color: #fff;
          margin-top: 10px;
        }

        .continue-button:hover {
          background: #16a34a;
        }

        .overlay-preview {
          margin-top: 20px;
          text-align: center;
        }

        .overlay-preview img {
          max-width: 100%;
          max-height: 200px;
          border-radius: 8px;
          border: 2px solid #333;
        }
      `}</style>
    </div>
  );
}

