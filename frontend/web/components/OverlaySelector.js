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
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      // Проверяем размер (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setOverlayImage(event.target.result);
        setOverlayEnabled(true);
        if (onOverlayChange) {
          onOverlayChange(event.target.result, true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveOverlay = () => {
    setOverlayImage(null);
    setOverlayEnabled(false);
    setShowOverlay(false);
    if (onOverlayChange) {
      onOverlayChange(null, false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleOverlay = () => {
    const newState = !showOverlay;
    setShowOverlay(newState);
    if (onOverlayChange && overlayImage) {
      onOverlayChange(overlayImage, newState);
    }
  };

  return (
    <div className="overlay-selector">
      <div className="overlay-controls">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="select-overlay-button"
        >
          📷 Выбрать заставку
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {overlayImage && (
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

