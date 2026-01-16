# Инструкция по переносу системы скриншотов стримов на сервер

## Что было добавлено

Реализована система автоматических скриншотов стримов:
- Захват скриншотов при старте стрима и каждые 30 секунд
- Сохранение скриншотов на сервере
- Автоматическая очистка скриншотов старше 1 дня
- Использование скриншотов в превью стримов на главной странице

## Шаги для переноса на локальный сервер (Windows)

### 1. Откройте терминал в директории проекта

```powershell
cd C:\Users\1\Documents\bigo
```

### 2. Получите последние изменения из git

```powershell
git pull origin master
```

### 3. Установите зависимости (если нужно)

#### Backend

```powershell
cd backend
npm install
```

#### Frontend

```powershell
cd ..\frontend\web
npm install
```

### 4. Создайте директорию для скриншотов

```powershell
# Вернитесь в корень проекта
cd C:\Users\1\Documents\bigo

# Создайте директорию
New-Item -ItemType Directory -Force -Path "backend\uploads\streams\screenshots"
```

### 5. Обновите Backend

Если используете PM2:

```powershell
cd backend
npm install
pm2 restart nio-backend
```

Или если запускаете через npm:

```powershell
# Остановите текущий процесс (Ctrl+C)
npm install
# Затем запустите снова
npm run dev
```

### 6. Обновите Frontend

Если используете PM2:

```powershell
cd ..\frontend\web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
pm2 restart nio-frontend
```

Или если запускаете через npm:

```powershell
# Остановите текущий процесс (Ctrl+C)
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
# Затем запустите снова
npm run dev
```

### 7. Обновите Admin (если были изменения)

Если используете PM2:

```powershell
cd ..\..\admin
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
pm2 restart nio-admin
```

Или если запускаете через npm:

```powershell
# Остановите текущий процесс (Ctrl+C)
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
# Затем запустите снова
npm run dev
```

### 8. Проверьте работу

1. Откройте http://localhost:3000/stream/create
2. Начните стрим
3. Проверьте, что скриншоты создаются (должны появляться в `backend\uploads\streams\screenshots\`)
4. Проверьте, что на главной странице отображаются скриншоты в превью стримов

## Шаги для переноса на удаленный сервер

### 1. Подключитесь к серверу

```bash
ssh root@ваш_сервер
```

### 2. Обновите код из git

```bash
cd /ssd/www/bigo-mvp
git pull origin master
```

### 3. Обновите Backend

```bash
cd /ssd/www/bigo-mvp/backend
npm install
pm2 restart nio-backend
```

### 4. Обновите Frontend

```bash
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend
```

### 5. Обновите Admin (если были изменения)

```bash
cd /ssd/www/bigo-mvp/admin
rm -rf .next
npm run build
pm2 restart nio-admin
```

### 6. Создайте директорию для скриншотов (если еще не создана)

```bash
cd /ssd/www/bigo-mvp
mkdir -p backend/uploads/streams/screenshots
chmod 755 backend/uploads/streams/screenshots
```

### 7. Проверьте статус всех сервисов

```bash
pm2 status all
```

### 8. Проверьте логи

```bash
# Логи backend
pm2 logs nio-backend --lines 50

# Логи frontend
pm2 logs nio-frontend --lines 50
```

### 9. Проверьте работу

1. Откройте https://bigo.1tlt.ru/stream/create
2. Начните стрим
3. Проверьте, что скриншоты создаются (должны появляться в `/ssd/www/bigo-mvp/backend/uploads/streams/screenshots/`)
4. Проверьте, что на главной странице отображаются скриншоты в превью стримов

### 10. Проверьте очистку старых скриншотов

Очистка запускается автоматически каждый час. Можно проверить логи:

```bash
pm2 logs nio-backend | grep "Очищено.*скриншотов"
```

## Возможные проблемы и решения

### Проблема: Скриншоты не сохраняются

**Решение:**
1. Проверьте права на директорию:
   ```bash
   ls -la /ssd/www/bigo-mvp/backend/uploads/streams/screenshots
   ```
2. Убедитесь, что директория существует и доступна для записи
3. Проверьте логи backend на наличие ошибок

### Проблема: Скриншоты не отображаются в превью

**Решение:**
1. Проверьте, что статические файлы доступны через `/uploads`
2. Проверьте конфигурацию Apache/Nginx для обслуживания статических файлов
3. Проверьте консоль браузера на наличие ошибок загрузки изображений

### Проблема: Ошибка при загрузке скриншота

**Решение:**
1. Проверьте размер файла (максимум 2MB)
2. Проверьте формат (должен быть JPEG)
3. Проверьте, что стрим активен и принадлежит пользователю

## Проверка работы системы

### Проверка API endpoint для скриншотов

```bash
# Получить скриншот стрима (замените STREAM_ID на реальный ID)
curl https://api.bigo.1tlt.ru/api/streams/STREAM_ID/screenshot
```

### Проверка директории со скриншотами

```bash
ls -lah /ssd/www/bigo-mvp/backend/uploads/streams/screenshots/
```

Должны быть файлы вида: `{streamId}-{timestamp}.jpg`

## Автоматическая очистка

Очистка старых скриншотов запускается:
- При старте сервера
- Каждый час автоматически

Старые скриншоты (старше 1 дня) удаляются автоматически.

## Откат изменений (если нужно)

Если нужно откатить изменения:

```bash
cd /ssd/www/bigo-mvp
git log --oneline  # Найти коммит до изменений
git revert HEAD   # Или указать конкретный коммит
git push origin master
```

Затем перезапустить сервисы:

```bash
pm2 restart nio-backend
pm2 restart nio-frontend
```
