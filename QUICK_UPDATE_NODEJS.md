# Быстрое обновление Node.js на сервере

## Проблема

```
You are using Node.js 16.20.2. For Next.js, Node.js version >= v18.17.0 is required.
```

## Решение: Обновление Node.js

### Вариант 1: Использование NVM (рекомендуется)

```bash
# 1. Установите NVM (если еще не установлен)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. Перезагрузите shell или выполните:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Установите Node.js 18 LTS
nvm install 18

# 4. Используйте Node.js 18
nvm use 18

# 5. Установите как версию по умолчанию
nvm alias default 18

# 6. Проверьте версию
node -v
# Должно быть: v18.x.x или выше

# 7. Проверьте версию npm
npm -v
```

### Вариант 2: Использование NodeSource (альтернатива)

```bash
# 1. Добавьте репозиторий NodeSource для Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 2. Установите Node.js 18
sudo apt-get install -y nodejs

# 3. Проверьте версию
node -v
# Должно быть: v18.x.x или выше

# 4. Проверьте версию npm
npm -v
```

### Вариант 3: Использование Snap (быстрый способ)

```bash
# 1. Установите Node.js 18 через Snap
sudo snap install node --classic --channel=18

# 2. Проверьте версию
node -v
# Должно быть: v18.x.x или выше
```

## После обновления Node.js

### 1. Остановите PM2 процессы

```bash
pm2 stop all
```

### 2. Переустановите зависимости фронтенда

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Удалите старые зависимости
rm -rf node_modules package-lock.json

# Переустановите с новой версией Node.js
npm install

# Пересоберите проект
npm run build
```

### 3. Перезапустите PM2

```bash
# Удалите старый процесс
pm2 delete nio-frontend

# Запустите заново
cd /ssd/www/bigo-mvp/frontend/web
pm2 start ecosystem.config.js

# Сохраните конфигурацию
pm2 save

# Проверьте логи
pm2 logs nio-frontend --lines 20
```

## Проверка

```bash
# 1. Проверьте версию Node.js
node -v
# Должно быть: v18.x.x или выше

# 2. Проверьте статус PM2
pm2 status
# Должен быть online

# 3. Проверьте логи
pm2 logs nio-frontend --lines 10
# НЕ должно быть ошибки "You are using Node.js 16.20.2"

# 4. Проверьте сайт
curl http://localhost:3000
# Должен вернуть HTML
```

## Если PM2 все еще использует старую версию Node.js

PM2 может кэшировать путь к Node.js. Нужно перезапустить PM2:

```bash
# 1. Остановите PM2
pm2 kill

# 2. Проверьте, какая версия Node.js используется
which node
node -v

# 3. Запустите PM2 снова
pm2 resurrect

# 4. Или запустите процессы заново
cd /ssd/www/bigo-mvp/frontend/web
pm2 start ecosystem.config.js
pm2 save
```

## Если используется systemd для PM2

Если PM2 запущен через systemd, нужно обновить путь к Node.js:

```bash
# 1. Найдите путь к новой версии Node.js
which node

# 2. Отредактируйте systemd service
sudo systemctl edit pm2-root

# 3. Добавьте:
[Service]
Environment="PATH=/root/.nvm/versions/node/v18.x.x/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# 4. Перезапустите PM2 service
sudo systemctl restart pm2-root
```

## Готово!

После обновления Node.js и перезапуска PM2 ошибка "You are using Node.js 16.20.2" должна исчезнуть, и Next.js должен запуститься.

