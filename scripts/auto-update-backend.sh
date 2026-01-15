#!/bin/bash

# Скрипт автоматического обновления только бэкенда
# Используется в cron для периодического обновления

LOG_FILE="/var/log/bigo-backend-update.log"
PROJECT_DIR="/ssd/www/bigo-mvp"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

cd "$PROJECT_DIR" || exit 1

log "Проверка обновлений бэкенда..."
git fetch origin master

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "Нет новых обновлений."
    exit 0
fi

log "Найдены обновления. Обновляю бэкенд..."

git pull origin master

cd backend || exit 1
npm install

if [ $? -eq 0 ]; then
    pm2 restart bigo-backend --update-env
    log "Бэкенд успешно обновлен и перезапущен"
else
    log "ОШИБКА: Установка зависимостей бэкенда не удалась!"
    exit 1
fi

