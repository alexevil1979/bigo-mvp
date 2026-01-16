#!/bin/bash

# Скрипт автоматического обновления проекта с GitHub
# Использование: ./auto-update.sh [frontend|admin|backend|all]

LOG_FILE="/var/log/bigo-auto-update.log"
PROJECT_DIR="/ssd/www/bigo-mvp"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Функция для логирования
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Переходим в директорию проекта
cd "$PROJECT_DIR" || exit 1

# Проверяем, есть ли изменения на GitHub
log "Проверка обновлений на GitHub..."
git fetch origin master

# Сравниваем локальную и удаленную версии
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "Нет новых обновлений. Выход."
    exit 0
fi

log "Найдены новые обновления. Начинаю обновление..."

# Определяем, что обновлять
UPDATE_TYPE=${1:-all}

case $UPDATE_TYPE in
    frontend)
        log "Обновление фронтенда..."
        git pull origin master
        
        cd frontend/web || exit 1
        npm install
        npm run build
        pm2 restart nio-frontend
        log "Фронтенд обновлен и перезапущен"
        ;;
        
    admin)
        log "Обновление админки..."
        git pull origin master
        
        cd admin || exit 1
        npm install
        npm run build
        pm2 restart nio-admin
        log "Админка обновлена и перезапущена"
        ;;
        
    backend)
        log "Обновление бэкенда..."
        git pull origin master
        
        cd backend || exit 1
        npm install
        pm2 restart bigo-backend --update-env
        log "Бэкенд обновлен и перезапущен"
        ;;
        
    all|*)
        log "Обновление всех компонентов..."
        git pull origin master
        
        # Обновление бэкенда
        log "Обновление бэкенда..."
        cd backend || exit 1
        npm install
        pm2 restart bigo-backend --update-env
        cd "$PROJECT_DIR" || exit 1
        
        # Обновление фронтенда
        log "Обновление фронтенда..."
        cd frontend/web || exit 1
        npm install
        npm run build
        pm2 restart nio-frontend
        cd "$PROJECT_DIR" || exit 1
        
        # Обновление админки
        log "Обновление админки..."
        cd admin || exit 1
        npm install
        npm run build
        pm2 restart nio-admin
        cd "$PROJECT_DIR" || exit 1
        
        log "Все компоненты обновлены и перезапущены"
        ;;
esac

log "Обновление завершено успешно!"
exit 0



