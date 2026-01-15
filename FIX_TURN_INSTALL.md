# Исправление ошибки установки TURN сервера

## Проблема

При запуске `setup-turn.sh` возникает ошибка:
```
E: The repository 'http://old-releases.ubuntu.com/ubuntu bionic Release' does not have a Release file.
```

## Решение

### Вариант 1: Исправить репозитории (рекомендуется)

```bash
# Удалите проблемные репозитории
sudo sed -i '/old-releases.ubuntu.com/d' /etc/apt/sources.list
sudo sed -i '/old-releases.ubuntu.com/d' /etc/apt/sources.list.d/*.list 2>/dev/null || true

# Обновите список пакетов
sudo apt update
```

### Вариант 2: Продолжить установку вручную

```bash
# Установите coturn напрямую (игнорируя ошибки репозиториев)
sudo apt install -y coturn 2>&1 | grep -v "does not have a Release file" || true

# Если установка не удалась, попробуйте:
sudo apt-get install -y coturn --fix-missing
```

### Вариант 3: Использовать обновленный скрипт

```bash
cd /ssd/www/bigo-mvp
git pull origin master
cd backend/scripts
chmod +x setup-turn.sh
sudo ./setup-turn.sh
```

## После установки coturn

Продолжите настройку вручную:

### 1. Генерация секретного ключа

```bash
SECRET_KEY=$(openssl rand -hex 32)
echo "Секретный ключ: $SECRET_KEY"
```

### 2. Получение публичного IP

```bash
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Публичный IP: $PUBLIC_IP"
```

### 3. Создание конфигурации

```bash
sudo nano /etc/turnserver.conf
```

Добавьте:

```ini
listening-ip=0.0.0.0
external-ip=ВАШ_ПУБЛИЧНЫЙ_IP
listening-port=3478
min-port=49152
max-port=65535
relay-ip=0.0.0.0
static-auth-secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
realm=bigo.1tlt.ru
log-file=/var/log/turnserver.log
verbose
no-cli
no-tls
no-dtls
```

### 4. Включение и запуск

```bash
# Включить сервис
sudo sed -i 's/^TURNSERVER_ENABLED=0/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Открыть порты
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 49152:65535/udp
sudo ufw allow 49152:65535/tcp

# Запустить
sudo systemctl restart coturn
sudo systemctl enable coturn

# Проверить
sudo systemctl status coturn
```

### 5. Настройка фронтенда

Создайте `frontend/web/.env.local`:

```env
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:bigo.1tlt.ru:3478
NEXT_PUBLIC_WEBRTC_TURN_SECRET=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

### 6. Пересборка фронтенда

```bash
cd /ssd/www/bigo-mvp/frontend/web
npm run build
pm2 restart nio-frontend
```

