#!/bin/bash

# Скрипт для автоматической настройки .env.local из конфигурации TURN сервера (username/password)
# Использование: ./setup-turn-env-from-server.sh

echo "🔧 Настройка переменных окружения для TURN сервера из конфигурации..."

# Проверяем, существует ли конфигурация TURN сервера
TURN_CONF="/etc/turnserver.conf"

if [ ! -f "$TURN_CONF" ]; then
    echo "❌ Файл конфигурации TURN сервера не найден: $TURN_CONF"
    echo "   Установите TURN сервер или укажите путь к конфигурации вручную"
    exit 1
fi

# Извлекаем username и password из конфигурации TURN сервера
# Формат: user=username:password
TURN_USER=$(sudo grep "^user=" "$TURN_CONF" | head -n 1 | cut -d'=' -f2 | tr -d ' ')

if [ -z "$TURN_USER" ]; then
    echo "❌ Пользователь TURN сервера не найден в конфигурации"
    echo "   Добавьте в $TURN_CONF строку: user=username:password"
    echo ""
    echo "   Пример:"
    echo "   user=nio-turn-user:your-password-here"
    exit 1
fi

# Разделяем username и password
TURN_USERNAME=$(echo "$TURN_USER" | cut -d':' -f1)
TURN_PASSWORD=$(echo "$TURN_USER" | cut -d':' -f2)

if [ -z "$TURN_USERNAME" ] || [ -z "$TURN_PASSWORD" ]; then
    echo "❌ Неверный формат пользователя в конфигурации"
    echo "   Ожидается формат: user=username:password"
    echo "   Найдено: user=$TURN_USER"
    exit 1
fi

echo "✅ Найдены учетные данные TURN сервера"
echo "   Username: $TURN_USERNAME"

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
echo "✅ Готово! Теперь пересоберите фронтенд:"
echo "   rm -rf .next"
echo "   npm run build"
echo "   pm2 restart nio-frontend"

