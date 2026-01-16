# Финальное исправление: видео не работает на мобильном

## Пошаговая диагностика и исправление

### Шаг 1: Проверьте конфигурацию TURN сервера

```bash
# Проверьте external-ip
sudo cat /etc/turnserver.conf | grep external-ip

# Должно быть:
# external-ip=81.23.181.220 (ваш публичный IP)
# или
# external-ip=bigo.1tlt.ru

# Если не установлен или неправильный:
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"

# Отредактируйте конфигурацию
sudo nano /etc/turnserver.conf

# Добавьте или исправьте:
# external-ip=$PUBLIC_IP
# или
# external-ip=bigo.1tlt.ru

# Перезапустите TURN сервер
sudo systemctl restart coturn
sudo systemctl status coturn
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

### Шаг 4: Проверьте через Trickle ICE (КРИТИЧЕСКИ ВАЖНО!)

1. Откройте: **https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/**
2. Введите:
   - **STUN/TURN Server:** `turn:bigo.1tlt.ru:3478`
   - **Username:** (оставьте пустым)
   - **Password:** (оставьте пустым)
3. Нажмите "Add Server"
4. Нажмите "Gather candidates"
5. **ПРОВЕРЬТЕ: Должен появиться кандидат типа `relay`!**

**Если кандидат `relay` НЕ появился:**
- Проблема в конфигурации TURN сервера (external-ip)
- Или в пробросе портов на роутере
- Или в файрволе на сервере

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

Ищите:
- Ошибки подключения
- Сообщения о неправильной аутентификации
- Сообщения о подключениях (должны быть при попытке подключения с мобильного)

### Шаг 6: Проверьте логи фронтенда

```bash
# Проверьте логи PM2
pm2 logs nio-frontend --lines 50

# Ищите ошибки:
# - "TURN server with empty username or password"
# - Ошибки WebRTC
# - Ошибки подключения к TURN серверу
```

## Быстрое исправление (все в одном)

```bash
# 1. Проверьте и исправьте external-ip
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"
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
sudo tail -f /var/log/turnserver/turnserver.log
```

## Проверка через Trickle ICE

**ОБЯЗАТЕЛЬНО проверьте через Trickle ICE!**

1. Откройте: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Введите: `turn:bigo.1tlt.ru:3478`
3. Нажмите "Gather candidates"
4. **Должен появиться кандидат типа `relay`!**

**Если кандидат `relay` не появился:**
- TURN сервер не работает правильно
- Проверьте external-ip в конфигурации
- Проверьте проброс портов на роутере
- Проверьте файрвол на сервере

**Если кандидат `relay` появился:**
- TURN сервер работает правильно
- Проблема в переменных окружения фронтенда
- Убедитесь, что фронтенд пересобран после обновления .env.local

## Если все еще не работает

1. **Проверьте консоль браузера на мобильном:**
   - Откройте DevTools (если возможно)
   - Проверьте, нет ли ошибок WebRTC
   - Проверьте, используются ли TURN серверы

2. **Проверьте переменные окружения в браузере:**
   ```javascript
   // В консоли браузера
   console.log(process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER);
   console.log(process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET);
   ```

3. **Проверьте ICE кандидаты:**
   - В консоли браузера должны появляться кандидаты типа `relay`
   - Если только `host` и `srflx` - TURN сервер не используется

## Готово!

После выполнения всех шагов и проверки через Trickle ICE видео должно работать на мобильных устройствах.



