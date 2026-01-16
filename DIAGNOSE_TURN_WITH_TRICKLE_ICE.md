# Диагностика TURN сервера через Trickle ICE

## Что такое Trickle ICE?

Trickle ICE - это инструмент для тестирования WebRTC соединений. Он показывает все ICE кандидаты, которые используются для установления соединения.

## Как использовать Trickle ICE для диагностики

### Шаг 1: Откройте Trickle ICE

Перейдите по адресу:
**https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/**

### Шаг 2: Настройте STUN/TURN серверы

В форме на странице введите:

#### Для STUN (базовый):
```
stun:stun.l.google.com:19302
```

#### Для TURN (ваш сервер):

**Вариант 1: Если используете static-auth-secret (рекомендуется):**

```
TURN URI: turn:bigo.1tlt.ru:3478
Username: (оставьте пустым)
Password: (оставьте пустым)
```

**Вариант 2: Если используете username/password:**

```
TURN URI: turn:bigo.1tlt.ru:3478
Username: ваш_username
Password: ваш_password
```

**Важно:** 
- Используйте `turn:` (не `turn://` и не `turns://`)
- Порт должен быть `3478`
- Домен должен указывать на ваш сервер

### Шаг 3: Нажмите "Add Server" и затем "Gather candidates"

После нажатия "Gather candidates" вы увидите список ICE кандидатов.

## Что означают типы кандидатов?

### 1. **host** (локальный)
```
Type: host
IP: 192.168.1.100 (локальный IP)
```
- Это локальное соединение
- Работает только в одной сети
- **Не работает для мобильных устройств из интернета**

### 2. **srflx** (Server Reflexive)
```
Type: srflx
IP: 81.23.181.220 (публичный IP через NAT)
```
- Это соединение через NAT
- Может работать, но не всегда
- **Может не работать для мобильных устройств**

### 3. **relay** (Relay через TURN) ⭐
```
Type: relay
IP: 81.23.181.220 (IP TURN сервера)
```
- Это соединение через TURN сервер
- **ОБЯЗАТЕЛЬНО для мобильных устройств!**
- Если этого типа нет, TURN сервер не работает

## Что должно быть для работы на мобильных?

**Для успешной работы на мобильных устройствах ДОЛЖЕН появиться кандидат типа `relay`!**

Пример правильного результата:
```
Type: host
IP: 192.168.1.100
Port: 54321

Type: srflx
IP: 81.23.181.220
Port: 12345

Type: relay  ⭐ ЭТО ОБЯЗАТЕЛЬНО!
IP: 81.23.181.220
Port: 49152
```

## Если кандидат `relay` НЕ появляется

### Проблема 1: TURN сервер не настроен правильно

**Проверьте на сервере:**

```bash
# Проверьте конфигурацию TURN сервера
sudo cat /etc/turnserver.conf | grep -E "external-ip|static-auth-secret|realm|listening-port"

# Должно быть:
# external-ip=81.23.181.220 (или ваш публичный IP)
# static-auth-secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
# realm=bigo.1tlt.ru
# listening-port=3478
```

**Если external-ip не установлен:**

```bash
# Узнайте публичный IP
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"

# Отредактируйте конфигурацию
sudo nano /etc/turnserver.conf

# Добавьте или исправьте:
external-ip=$PUBLIC_IP
# или
external-ip=bigo.1tlt.ru

# Перезапустите TURN сервер
sudo systemctl restart coturn
sudo systemctl status coturn
```

### Проблема 2: Неправильный URL в Trickle ICE

**Проверьте:**
- URL должен быть: `turn:bigo.1tlt.ru:3478` (не `turn://`)
- Порт должен быть `3478`
- Домен должен указывать на ваш сервер

**Попробуйте также с IP:**
```
turn:81.23.181.220:3478
```

### Проблема 3: Проблемы с аутентификацией

**Если используете static-auth-secret:**

В Trickle ICE оставьте Username и Password пустыми.

**Если используете username/password:**

Убедитесь, что они правильные в конфигурации TURN сервера:
```bash
sudo cat /etc/turnserver.conf | grep user
```

### Проблема 4: Порты не проброшены или файрвол блокирует

**Проверьте на сервере:**

```bash
# Проверьте, что порты слушаются
sudo netstat -tulpn | grep 3478

# Проверьте файрвол
sudo ufw status | grep 3478

# Если порты не открыты:
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 49152:65535/udp
```

**Проверьте проброс портов на роутере:**
- Порт 3478 (TCP и UDP) должен быть проброшен
- Диапазон 49152-65535 (UDP) должен быть проброшен

### Проблема 5: TURN сервер не запущен

**Проверьте:**

```bash
sudo systemctl status coturn

# Если не запущен:
sudo systemctl start coturn
sudo systemctl enable coturn
```

## Пошаговая диагностика

### 1. Проверьте TURN сервер на сервере:

```bash
# Статус
sudo systemctl status coturn

# Логи
sudo tail -f /var/log/turnserver.log

# Порты
sudo netstat -tulpn | grep 3478

# Конфигурация
sudo cat /etc/turnserver.conf | grep -E "external-ip|static-auth-secret|realm"
```

### 2. Проверьте через Trickle ICE:

1. Откройте: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Введите: `turn:bigo.1tlt.ru:3478`
3. Оставьте Username и Password пустыми (если используете static-auth-secret)
4. Нажмите "Add Server"
5. Нажмите "Gather candidates"
6. **Проверьте, появился ли кандидат типа `relay`**

### 3. Если кандидат `relay` появился:

✅ TURN сервер работает правильно!

**Проверьте переменные окружения фронтенда:**

```bash
cat /ssd/www/bigo-mvp/frontend/web/.env.local | grep TURN
```

Должно быть:
```env
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
NEXT_PUBLIC_WEBRTC_TURN_SECRET=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

**Если переменные неправильные:**

```bash
# Получите секретный ключ
TURN_SECRET=$(sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2)

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

### 4. Если кандидат `relay` НЕ появился:

❌ TURN сервер не работает правильно!

**Выполните исправления:**

```bash
# 1. Узнайте публичный IP
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"

# 2. Проверьте и исправьте external-ip
sudo nano /etc/turnserver.conf
# Убедитесь, что есть:
# external-ip=$PUBLIC_IP
# или
# external-ip=bigo.1tlt.ru

# 3. Перезапустите TURN сервер
sudo systemctl restart coturn

# 4. Проверьте логи
sudo tail -f /var/log/turnserver.log
```

**Повторите проверку через Trickle ICE.**

## Проверка на мобильном устройстве

После того, как кандидат `relay` появился в Trickle ICE:

1. **Откройте сайт на мобильном устройстве**
2. **Откройте консоль браузера** (Chrome DevTools через USB или удаленную отладку)
3. **Проверьте ICE кандидаты в консоли:**

```javascript
// В консоли браузера должны появляться кандидаты типа relay
// При открытии стрима проверьте Network tab или WebRTC internals
```

4. **Откройте стрим** - видео должно загружаться и воспроизводиться

## Готово!

Если кандидат `relay` появляется в Trickle ICE, TURN сервер работает правильно. Убедитесь, что переменные окружения фронтенда настроены, и пересоберите фронтенд.



