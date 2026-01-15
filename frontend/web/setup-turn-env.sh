#!/bin/bash

# Скрипт для настройки переменных окружения TURN сервера с username/password
# Использование: ./setup-turn-env.sh

echo "🔧 Настройка переменных окружения для TURN сервера (username/password)..."

# Генерируем username и password для TURN сервера
TURN_USERNAME="nio-turn-user"
TURN_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)

# Если openssl недоступен, используем альтернативный метод
if [ -z "$TURN_PASSWORD" ]; then
    TURN_PASSWORD=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 24 | head -n 1)
fi

echo "✅ Сгенерированы учетные данные TURN сервера"
echo "   Username: $TURN_USERNAME"
echo "   Password: $TURN_PASSWORD"

# Путь к файлу .env.local
ENV_FILE=".env.local"

# Создаем или обновляем .env.local
cat > "$ENV_FILE" << EOF
# WebRTC TURN сервер для мобильных устройств
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478?transport=udp
NEXT_PUBLIC_WEBRTC_TURN_USERNAME=$TURN_USERNAME
NEXT_PUBLIC_WEBRTC_TURN_PASSWORD=$TURN_PASSWORD

# Socket и API URL
NEXT_PUBLIC_SOCKET_URL=https://api.bigo.1tlt.ru
NEXT_PUBLIC_API_URL=https://api.bigo.1tlt.ru
EOF

echo "✅ Файл $ENV_FILE создан/обновлен"
echo ""
echo "📋 Содержимое файла:"
cat "$ENV_FILE"
echo ""
echo "⚠️  ВАЖНО: Обновите конфигурацию TURN сервера (/etc/turnserver.conf):"
echo "   1. Убедитесь, что static-auth-secret закомментирован или удален"
echo "   2. Добавьте пользователя:"
echo "      user=$TURN_USERNAME:$TURN_PASSWORD"
echo ""
echo "Пример конфигурации /etc/turnserver.conf:"
echo "   user=$TURN_USERNAME:$TURN_PASSWORD"
echo ""
echo "После обновления конфигурации TURN сервера выполните:"
echo "   sudo systemctl restart coturn"
echo ""
echo "Затем пересоберите фронтенд:"
echo "   rm -rf .next"
echo "   npm run build"
echo "   pm2 restart nio-frontend"

