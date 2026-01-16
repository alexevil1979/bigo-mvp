# Быстрое исправление: TURN работает, но видео нет на мобиле

## Выполните на сервере:

### 1. Проверьте конфигурацию TURN сервера:

```bash
# Узнайте публичный IP
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"

# Проверьте external-ip в конфигурации
sudo grep external-ip /etc/turnserver.conf

# Если не установлен или неправильный:
sudo nano /etc/turnserver.conf
# Добавьте или исправьте:
# external-ip=$PUBLIC_IP
# или
# external-ip=bigo.1tlt.ru

# Перезапустите TURN сервер
sudo systemctl restart coturn
```

### 2. Проверьте и исправьте переменные окружения фронтенда:

```bash
# Получите секретный ключ из TURN сервера
TURN_SECRET=$(sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2)
echo "TURN Secret: $TURN_SECRET"

# Проверьте .env.local
cat /ssd/www/bigo-mvp/frontend/web/.env.local

# Если нужно, создайте или обновите:
cat > /ssd/www/bigo-mvp/frontend/web/.env.local << EOF
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
NEXT_PUBLIC_WEBRTC_TURN_SECRET=$TURN_SECRET
EOF

# Пересоберите фронтенд
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend
```

### 3. Проверьте файрвол:

```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 49152:65535/udp
sudo ufw status
```

### 4. Проверьте логи:

```bash
# Логи TURN сервера
sudo tail -f /var/log/turnserver.log

# Логи фронтенда
pm2 logs nio-frontend --lines 30
```

## Проверка:

1. **TURN сервер должен быть запущен:**
   ```bash
   sudo systemctl status coturn
   ```

2. **Порты должны слушаться:**
   ```bash
   sudo netstat -tulpn | grep 3478
   ```

3. **Переменные окружения должны быть установлены:**
   ```bash
   cat /ssd/www/bigo-mvp/frontend/web/.env.local | grep TURN
   ```

4. **Проверьте на мобильном устройстве:**
   - Откройте сайт
   - Откройте стрим
   - Видео должно работать

## Если не помогло:

Смотрите подробную инструкцию: `FIX_TURN_VIDEO_NOT_WORKING.md`



