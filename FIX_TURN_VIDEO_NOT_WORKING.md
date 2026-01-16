# Исправление: TURN сервер работает, но видео не работает на мобильных

## Диагностика проблемы

Если TURN сервер запущен (порт 3478 слушается), порты проброшены на роутере, но видео на мобильных устройствах не работает, проверьте следующее:

### Шаг 1: Проверьте конфигурацию TURN сервера

```bash
# Проверьте конфигурацию
sudo cat /etc/turnserver.conf | grep -E "external-ip|static-auth-secret|realm"
```

**Важно:** Должны быть установлены:
- `external-ip=ВАШ_ПУБЛИЧНЫЙ_IP` (или домен)
- `static-auth-secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ`
- `realm=bigo.1tlt.ru` (или ваш домен)

#### Если external-ip не установлен или неправильный:

```bash
# Узнайте ваш публичный IP
curl ifconfig.me

# Отредактируйте конфигурацию
sudo nano /etc/turnserver.conf

# Найдите строку external-ip и установите правильный IP:
external-ip=ВАШ_ПУБЛИЧНЫЙ_IP

# Или используйте домен (если он указывает на ваш сервер):
external-ip=bigo.1tlt.ru

# Перезапустите TURN сервер
sudo systemctl restart coturn
```

### Шаг 2: Проверьте переменные окружения фронтенда

```bash
# Проверьте файл .env.local
cat /ssd/www/bigo-mvp/frontend/web/.env.local
```

**Должны быть установлены:**
```env
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
NEXT_PUBLIC_WEBRTC_TURN_SECRET=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ_ИЗ_TURN_SERVER
```

**Важно:**
- URL должен начинаться с `turn:` (не `turn://`)
- Порт должен быть `3478`
- Секретный ключ должен совпадать с `static-auth-secret` в `/etc/turnserver.conf`

#### Если переменные не установлены или неправильные:

```bash
# Отредактируйте файл
nano /ssd/www/bigo-mvp/frontend/web/.env.local

# Добавьте или исправьте:
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
NEXT_PUBLIC_WEBRTC_TURN_SECRET=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ

# Сохраните и пересоберите фронтенд
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend
```

### Шаг 3: Проверьте логи TURN сервера

```bash
# Просмотр логов в реальном времени
sudo tail -f /var/log/turnserver.log

# Или через journalctl
sudo journalctl -u coturn -f
```

**Что искать:**
- Ошибки подключения
- Сообщения о неправильной аутентификации
- Сообщения о недоступности портов

**Если видите ошибки аутентификации:**
- Проверьте, что `NEXT_PUBLIC_WEBRTC_TURN_SECRET` совпадает с `static-auth-secret` в конфигурации TURN сервера

### Шаг 4: Проверьте, что фронтенд использует TURN сервер

Откройте консоль браузера на мобильном устройстве (Chrome DevTools через USB или удаленную отладку) и проверьте:

1. **Проверьте переменные окружения:**
   ```javascript
   console.log(process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER);
   console.log(process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET);
   ```

2. **Проверьте ICE кандидаты:**
   - В консоли браузера должны появляться ICE кандидаты типа `relay` (не только `host` и `srflx`)
   - Если видите только `host` и `srflx`, TURN сервер не используется

### Шаг 5: Проверьте доступность TURN сервера извне

```bash
# На сервере проверьте, что порт доступен
sudo netstat -tulpn | grep 3478

# Проверьте извне (с другого компьютера или через онлайн-инструмент)
# Используйте: https://canyouseeme.org/
# Введите порт 3478 и проверьте, открыт ли он
```

### Шаг 6: Тестирование TURN сервера

Используйте онлайн-инструмент для тестирования:

1. Откройте: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Введите STUN/TURN серверы:
   ```
   STUN: stun:stun.l.google.com:19302
   TURN: turn:bigo.1tlt.ru:3478
   Username: (оставьте пустым, если используете static-auth-secret)
   Password: (оставьте пустым, если используете static-auth-secret)
   ```
3. Нажмите "Gather candidates"
4. Должны появиться кандидаты типа `relay` с IP вашего TURN сервера

**Если кандидаты `relay` не появляются:**
- Проверьте конфигурацию TURN сервера
- Проверьте проброс портов на роутере
- Проверьте файрвол на сервере

## Быстрое исправление (пошагово)

### 1. Проверьте и исправьте конфигурацию TURN сервера:

```bash
# Узнайте публичный IP
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"

# Проверьте конфигурацию
sudo cat /etc/turnserver.conf | grep external-ip

# Если external-ip не установлен или неправильный, отредактируйте:
sudo nano /etc/turnserver.conf

# Установите:
# external-ip=$PUBLIC_IP
# или
# external-ip=bigo.1tlt.ru

# Перезапустите
sudo systemctl restart coturn
sudo systemctl status coturn
```

### 2. Проверьте и исправьте переменные окружения:

```bash
# Проверьте секретный ключ в TURN сервере
TURN_SECRET=$(sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2)
echo "TURN Secret: $TURN_SECRET"

# Проверьте .env.local
cat /ssd/www/bigo-mvp/frontend/web/.env.local | grep TURN

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
# Убедитесь, что порты открыты
sudo ufw status | grep 3478

# Если нет, откройте:
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 49152:65535/udp
```

### 4. Проверьте логи:

```bash
# Просмотр логов TURN сервера
sudo tail -f /var/log/turnserver.log

# Просмотр логов фронтенда
pm2 logs nio-frontend --lines 50
```

## Частые проблемы и решения

### Проблема 1: external-ip не установлен

**Симптом:** TURN сервер работает, но не может установить соединения.

**Решение:**
```bash
sudo nano /etc/turnserver.conf
# Добавьте или исправьте:
external-ip=ВАШ_ПУБЛИЧНЫЙ_IP
sudo systemctl restart coturn
```

### Проблема 2: Секретный ключ не совпадает

**Симптом:** Ошибки аутентификации в логах TURN сервера.

**Решение:**
1. Проверьте секретный ключ в `/etc/turnserver.conf`:
   ```bash
   sudo grep static-auth-secret /etc/turnserver.conf
   ```

2. Убедитесь, что тот же ключ в `.env.local`:
   ```bash
   cat /ssd/www/bigo-mvp/frontend/web/.env.local | grep TURN_SECRET
   ```

3. Если не совпадают, обновите `.env.local` и пересоберите фронтенд.

### Проблема 3: URL TURN сервера неправильный

**Симптом:** Фронтенд не подключается к TURN серверу.

**Решение:**
- URL должен быть: `turn:bigo.1tlt.ru:3478` (не `turn://`, не `turns://`)
- Порт должен быть `3478`
- Домен должен указывать на ваш сервер

### Проблема 4: Порты не проброшены на роутере

**Симптом:** TURN сервер работает локально, но недоступен извне.

**Решение:**
- Проверьте проброс портов на роутере (см. `QUICK_TURN_PORT_FORWARDING.md`)
- Убедитесь, что проброшены порты 3478 (TCP и UDP)
- Проверьте через онлайн-инструмент: https://canyouseeme.org/

### Проблема 5: Файрвол блокирует порты

**Симптом:** Порты проброшены, но недоступны.

**Решение:**
```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 49152:65535/udp
sudo ufw status
```

## Проверка после исправления

1. **Проверьте TURN сервер:**
   ```bash
   sudo systemctl status coturn
   sudo tail -f /var/log/turnserver.log
   ```

2. **Проверьте фронтенд:**
   ```bash
   pm2 logs nio-frontend --lines 30
   ```

3. **Проверьте на мобильном устройстве:**
   - Откройте сайт на мобильном
   - Откройте стрим
   - Видео должно загружаться и воспроизводиться

4. **Проверьте через Trickle ICE:**
   - https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   - Должны появиться кандидаты типа `relay`

## Готово!

После выполнения всех шагов видео должно работать на мобильных устройствах.



