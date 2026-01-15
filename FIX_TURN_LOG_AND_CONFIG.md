# Исправление проблем с TURN сервером: логи и конфигурация

## Проблемы

1. Ошибка: `ERROR: Cannot open log file for writing: /var/log/turnserver_2026-01-15.log`
2. Лог-файл не существует
3. Нужно проверить конфигурацию TURN сервера

## Решение

### Шаг 1: Исправьте проблему с лог-файлом

```bash
# Создайте директорию для логов (если не существует)
sudo mkdir -p /var/log

# Создайте файл лога и установите права
sudo touch /var/log/turnserver.log
sudo chown turnserver:turnserver /var/log/turnserver.log
sudo chmod 644 /var/log/turnserver.log

# Или измените конфигурацию, чтобы использовать другой путь
sudo nano /etc/turnserver.conf
```

**В конфигурации измените:**
```ini
# Вместо:
log-file=/var/log/turnserver.log

# Используйте:
log-file=/var/log/turnserver/turnserver.log
# или
# log-file=/tmp/turnserver.log
```

**Или создайте директорию:**
```bash
sudo mkdir -p /var/log/turnserver
sudo chown turnserver:turnserver /var/log/turnserver
sudo chmod 755 /var/log/turnserver
```

### Шаг 2: Проверьте и исправьте конфигурацию TURN сервера

```bash
# Проверьте текущую конфигурацию
sudo cat /etc/turnserver.conf | grep -E "external-ip|static-auth-secret|realm|listening-port|log-file"
```

**Важно:** Должны быть установлены:
- `external-ip=ВАШ_ПУБЛИЧНЫЙ_IP` (или домен)
- `static-auth-secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ`
- `realm=bigo.1tlt.ru`
- `listening-port=3478`

#### Если external-ip не установлен:

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
```

### Шаг 3: Исправьте путь к лог-файлу в конфигурации

```bash
sudo nano /etc/turnserver.conf
```

**Найдите строку:**
```ini
log-file=/var/log/turnserver.log
```

**Измените на:**
```ini
log-file=/var/log/turnserver/turnserver.log
```

**Или создайте файл:**
```bash
sudo touch /var/log/turnserver.log
sudo chown turnserver:turnserver /var/log/turnserver.log
sudo chmod 644 /var/log/turnserver.log
```

### Шаг 4: Перезапустите TURN сервер

```bash
sudo systemctl restart coturn
sudo systemctl status coturn
```

**Не должно быть ошибок с лог-файлом!**

### Шаг 5: Проверьте логи

```bash
# Теперь логи должны работать
sudo tail -f /var/log/turnserver.log
# или
sudo tail -f /var/log/turnserver/turnserver.log
```

### Шаг 6: Проверьте работу TURN сервера

```bash
# Проверьте, что порт слушается
sudo netstat -tulpn | grep 3478

# Проверьте статус
sudo systemctl status coturn

# Проверьте через journalctl (если лог-файл все еще не работает)
sudo journalctl -u coturn -f
```

## Полная проверка конфигурации

### Проверьте все важные параметры:

```bash
sudo cat /etc/turnserver.conf | grep -v "^#" | grep -v "^$" | grep -E "listening-ip|external-ip|listening-port|min-port|max-port|relay-ip|static-auth-secret|realm|log-file"
```

**Должно быть примерно так:**
```
listening-ip=0.0.0.0
external-ip=81.23.181.220
listening-port=3478
min-port=49152
max-port=65535
relay-ip=0.0.0.0
static-auth-secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
realm=bigo.1tlt.ru
log-file=/var/log/turnserver/turnserver.log
verbose
```

## Проверка через telnet (правильная команда)

**Важно:** `turn:` - это префикс для WebRTC, не для telnet!

```bash
# Правильная команда для проверки порта:
telnet bigo.1tlt.ru 3478
# или
telnet 81.23.181.220 3478

# Если telnet не установлен:
sudo apt install telnet

# Или используйте nc (netcat):
nc -zv bigo.1tlt.ru 3478
# или
nc -zv 81.23.181.220 3478
```

## Проверка переменных окружения фронтенда

```bash
# Проверьте .env.local
cat /ssd/www/bigo-mvp/frontend/web/.env.local | grep TURN

# Должно быть:
# NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
# NEXT_PUBLIC_WEBRTC_TURN_SECRET=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ

# Если нужно обновить:
TURN_SECRET=$(sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2)
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

## Быстрое исправление (все в одном)

```bash
# 1. Создайте директорию для логов
sudo mkdir -p /var/log/turnserver
sudo chown turnserver:turnserver /var/log/turnserver
sudo chmod 755 /var/log/turnserver

# 2. Узнайте публичный IP
PUBLIC_IP=$(curl ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"

# 3. Проверьте и исправьте конфигурацию
sudo nano /etc/turnserver.conf

# Убедитесь, что есть:
# external-ip=$PUBLIC_IP (или bigo.1tlt.ru)
# log-file=/var/log/turnserver/turnserver.log

# 4. Перезапустите TURN сервер
sudo systemctl restart coturn

# 5. Проверьте статус (не должно быть ошибок)
sudo systemctl status coturn

# 6. Проверьте логи
sudo tail -f /var/log/turnserver/turnserver.log
# или
sudo journalctl -u coturn -f
```

## Проверка через Trickle ICE

После исправления проверьте через Trickle ICE:
1. Откройте: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Введите: `turn:bigo.1tlt.ru:3478`
3. Нажмите "Gather candidates"
4. **Должен появиться кандидат типа `relay`!**

## Готово!

После исправления:
- ✅ Лог-файл должен работать
- ✅ TURN сервер должен работать без ошибок
- ✅ В Trickle ICE должен появиться кандидат `relay`
- ✅ Видео должно работать на мобильных устройствах

