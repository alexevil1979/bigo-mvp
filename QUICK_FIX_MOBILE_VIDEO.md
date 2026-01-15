# Быстрое исправление: видео не работает на мобильном

## Диагностика

### Шаг 1: Проверьте конфигурацию TURN сервера

```bash
# Проверьте external-ip
sudo grep external-ip /etc/turnserver.conf

# Должно быть:
# external-ip=81.23.181.220 (или ваш публичный IP)
# или
# external-ip=bigo.1tlt.ru

# Если не установлен:
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"

# Отредактируйте конфигурацию
sudo nano /etc/turnserver.conf
# Добавьте или исправьте:
# external-ip=$PUBLIC_IP

# Перезапустите TURN сервер
sudo systemctl restart coturn
```

### Шаг 2: Проверьте переменные окружения фронтенда

```bash
# Проверьте .env.local
cat /ssd/www/bigo-mvp/frontend/web/.env.local | grep TURN

# Должно быть:
# NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
# NEXT_PUBLIC_WEBRTC_TURN_SECRET=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

### Шаг 3: Если переменные не установлены или неправильные

```bash
# Получите секретный ключ из TURN сервера
TURN_SECRET=$(sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2)
echo "TURN Secret: $TURN_SECRET"

# Обновите .env.local
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

### Шаг 4: Проверьте через Trickle ICE

1. Откройте: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Введите:
   - **STUN/TURN Server:** `turn:bigo.1tlt.ru:3478`
   - **Username:** (оставьте пустым)
   - **Password:** (оставьте пустым)
3. Нажмите "Add Server"
4. Нажмите "Gather candidates"
5. **Проверьте, появился ли кандидат типа `relay`!**

**Если кандидат `relay` НЕ появился:**
- Проверьте конфигурацию TURN сервера (external-ip)
- Проверьте проброс портов на роутере
- Проверьте файрвол на сервере

**Если кандидат `relay` появился:**
- TURN сервер работает правильно
- Проблема в переменных окружения фронтенда или их использовании

### Шаг 5: Проверьте логи TURN сервера

```bash
# Проверьте логи
sudo tail -f /var/log/turnserver/turnserver.log
# или
sudo journalctl -u coturn -f
```

Ищите ошибки или сообщения о подключениях.

## Быстрое исправление (все в одном)

```bash
# 1. Проверьте и исправьте external-ip
PUBLIC_IP=$(curl ifconfig.me)
sudo grep external-ip /etc/turnserver.conf || echo "external-ip=$PUBLIC_IP" | sudo tee -a /etc/turnserver.conf
sudo systemctl restart coturn

# 2. Обновите переменные окружения
TURN_SECRET=$(sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2)
cat > /ssd/www/bigo-mvp/frontend/web/.env.local << EOF
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
NEXT_PUBLIC_WEBRTC_TURN_SECRET=$TURN_SECRET
EOF

# 3. Пересоберите фронтенд
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend

# 4. Проверьте логи
pm2 logs nio-frontend --lines 30
```

## Проверка

1. **Проверьте через Trickle ICE:**
   - Должен появиться кандидат типа `relay`

2. **Проверьте на мобильном устройстве:**
   - Откройте сайт
   - Откройте стрим
   - Видео должно работать

3. **Проверьте консоль браузера на мобильном:**
   - Откройте DevTools (если возможно)
   - Проверьте, нет ли ошибок WebRTC
   - Проверьте, используются ли TURN серверы

## Если не помогло

Смотрите подробные инструкции:
- `DIAGNOSE_TURN_WITH_TRICKLE_ICE.md` - диагностика через Trickle ICE
- `FIX_TURN_VIDEO_NOT_WORKING.md` - подробное исправление
- `FIX_TURN_LOG_AND_CONFIG.md` - исправление конфигурации TURN

