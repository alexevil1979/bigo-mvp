#!/bin/bash

# Скрипт автоматического обновления только фронтенда
# Используется в cron для периодического обновления

LOG_FILE="/var/log/bigo-frontend-update.log"
PROJECT_DIR="/ssd/www/bigo-mvp"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

cd "$PROJECT_DIR" || exit 1

log "Проверка обновлений фронтенда..."
git fetch origin master

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "Нет новых обновлений."
    exit 0
fi

log "Найдены обновления. Обновляю фронтенд..."

git pull origin master

cd frontend/web || exit 1
npm install --production=false
npm run build

if [ $? -eq 0 ]; then
    pm2 restart nio-frontend
    log "Фронтенд успешно обновлен и перезапущен"
else
    log "ОШИБКА: Сборка фронтенда не удалась!"
    exit 1
fi

