#!/bin/bash

# Скрипт для настройки переменных окружения TURN сервера
# Использование: ./setup-turn-env.sh

echo "🔧 Настройка переменных окружения для TURN сервера..."

# Генерируем случайный секретный ключ для TURN сервера (32 символа)
TURN_SECRET=$(openssl rand -hex 32)

# Если openssl недоступен, используем альтернативный метод
if [ -z "$TURN_SECRET" ]; then
    TURN_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
fi

echo "✅ Сгенерирован секретный ключ TURN сервера"

# Путь к файлу .env.local
ENV_FILE=".env.local"

# Создаем или обновляем .env.local
cat > "$ENV_FILE" << EOF
# WebRTC TURN сервер для мобильных устройств
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478?transport=udp
NEXT_PUBLIC_WEBRTC_TURN_SECRET=$TURN_SECRET

# Socket и API URL
NEXT_PUBLIC_SOCKET_URL=https://api.bigo.1tlt.ru
NEXT_PUBLIC_API_URL=https://api.bigo.1tlt.ru
EOF

echo "✅ Файл $ENV_FILE создан/обновлен"
echo ""
echo "📋 Содержимое файла:"
cat "$ENV_FILE"
echo ""
echo "⚠️  ВАЖНО: Обновите конфигурацию TURN сервера (/etc/turnserver.conf) с этим секретным ключом:"
echo "   static-auth-secret=$TURN_SECRET"
echo ""
echo "После обновления конфигурации TURN сервера выполните:"
echo "   sudo systemctl restart coturn"
echo ""
echo "Затем пересоберите фронтенд:"
echo "   rm -rf .next"
echo "   npm run build"
echo "   pm2 restart nio-frontend"

