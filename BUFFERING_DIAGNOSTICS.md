# Диагностика долгой буферизации видео

## Возможные причины долгой буферизации

### 1. Проблемы с WebRTC соединением
- **Симптомы:** Соединение установлено (`ICE connected`), но видео не получает данные
- **Причины:**
  - WebRTC не передает данные стабильно
  - Проблемы с TURN сервером
  - Неправильная настройка ICE кандидатов
  - Проблемы с сетью между стримером и зрителем

### 2. Проблемы с сетью
- **Симптомы:** Медленное соединение, высокий пинг
- **Причины:**
  - Медленный интернет у зрителя
  - Медленный интернет у стримера
  - Проблемы с маршрутизацией
  - Перегрузка сети

### 3. Проблемы на стороне стримера
- **Симптомы:** Стример не отправляет данные
- **Причины:**
  - Проблемы с камерой/микрофоном стримера
  - Проблемы с кодированием видео
  - Проблемы с WebRTC на стороне стримера

### 4. Конфликт play/pause
- **Симптомы:** Ошибка "play() request was interrupted by a call to pause()"
- **Причины:**
  - Множественные вызовы play() и pause()
  - Автоматические вызовы pause() браузером
  - Конфликт между разными обработчиками

### 5. Проблемы с буфером видео элемента
- **Симптомы:** Видео буферизуется, но не играет
- **Причины:**
  - Недостаточно данных в буфере
  - Проблемы с декодированием видео
  - Проблемы с форматом видео

## Диагностика

### Проверка WebRTC статистики

Добавьте в консоль браузера:

```javascript
// Получить статистику WebRTC
const pc = peerConnectionRef.current;
if (pc) {
  pc.getStats().then(stats => {
    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        console.log('WebRTC Video Stats:', {
          bytesReceived: report.bytesReceived,
          packetsReceived: report.packetsReceived,
          packetsLost: report.packetsLost,
          jitter: report.jitter,
          framesDecoded: report.framesDecoded,
          framesDropped: report.framesDropped
        });
      }
    });
  });
}
```

### Проверка буфера видео

```javascript
const video = videoRef.current;
if (video && video.buffered.length > 0) {
  const bufferedEnd = video.buffered.end(video.buffered.length - 1);
  const currentTime = video.currentTime;
  const bufferedAhead = bufferedEnd - currentTime;
  console.log('Video Buffer:', {
    bufferedAhead: bufferedAhead,
    currentTime: currentTime,
    bufferedEnd: bufferedEnd,
    readyState: video.readyState,
    networkState: video.networkState
  });
}
```

### Проверка состояния WebRTC

```javascript
const pc = peerConnectionRef.current;
if (pc) {
  console.log('WebRTC State:', {
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    signalingState: pc.signalingState,
    localDescription: pc.localDescription?.type,
    remoteDescription: pc.remoteDescription?.type
  });
}
```

## Решения

### 1. Улучшить обработку WebRTC статистики
- Добавить мониторинг статистики WebRTC
- Показывать предупреждение, если данные не передаются

### 2. Улучшить обработку буферизации
- Добавить индикатор загрузки
- Показывать информацию о буфере
- Предлагать переподключение при долгой буферизации

### 3. Исправить конфликт play/pause
- Убрать множественные вызовы play()
- Добавить проверку перед вызовом play()
- Использовать флаг для предотвращения конфликтов

### 4. Добавить переподключение
- Автоматическое переподключение при долгой буферизации
- Кнопка ручного переподключения

### 5. Оптимизировать настройки WebRTC
- Улучшить настройки ICE кандидатов
- Оптимизировать настройки кодека
- Добавить fallback на другой кодек
