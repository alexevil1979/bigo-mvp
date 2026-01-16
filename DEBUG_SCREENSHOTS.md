# Диагностика проблемы со скриншотами

## Что было добавлено

Добавлено подробное логирование для диагностики проблемы со скриншотами:
- Логи на фронтенде при захвате скриншотов
- Логи на бэкенде при сохранении скриншотов
- Проверка существования директории и файлов

## Шаги для переноса на удаленный сервер

### 1. Обновите код

```bash
cd /ssd/www/bigo-mvp
git reset --hard HEAD
git pull origin master
```

### 2. Обновите Backend

```bash
cd /ssd/www/bigo-mvp/backend
npm install
pm2 restart bigo-backend
```

### 3. Обновите Frontend

```bash
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend
```

### 4. Создайте директорию для скриншотов (если еще не создана)

```bash
cd /ssd/www/bigo-mvp
mkdir -p backend/uploads/streams/screenshots
chmod 755 backend/uploads/streams/screenshots
```

### 5. Проверьте права на директорию

```bash
ls -la /ssd/www/bigo-mvp/backend/uploads/streams/screenshots
```

Директория должна существовать и быть доступна для записи.

## Диагностика проблемы

### 1. Проверьте логи backend при старте стрима

```bash
pm2 logs bigo-backend --lines 100 | grep -i screenshot
```

Должны быть сообщения:
- `[Screenshot] Директория существует: ...`
- `[Screenshot Upload] Получен запрос на загрузку скриншота`

### 2. Проверьте логи frontend в консоли браузера

Откройте консоль браузера (F12) и начните стрим. Должны быть сообщения:
- `[Screenshot] Canvas создан для скриншотов`
- `[Screenshot] Захватываем первый скриншот при старте стрима`
- `[Screenshot] Начало захвата скриншота`
- `[Screenshot] Скриншот успешно загружен`

### 3. Проверьте, создаются ли файлы

```bash
ls -lah /ssd/www/bigo-mvp/backend/uploads/streams/screenshots/
```

Если файлы не создаются, проверьте:
- Права на директорию (должны быть 755 или 777)
- Логи backend на наличие ошибок
- Логи frontend в консоли браузера

### 4. Проверьте ошибки в логах

```bash
# Логи backend
pm2 logs bigo-backend --lines 200 | grep -i "screenshot\|error"

# Логи frontend (в консоли браузера)
# Ищите сообщения с префиксом [Screenshot]
```

## Возможные проблемы

### Проблема: Директория не создается

**Решение:**
```bash
cd /ssd/www/bigo-mvp/backend
mkdir -p uploads/streams/screenshots
chmod -R 755 uploads
```

### Проблема: Нет прав на запись

**Решение:**
```bash
chmod -R 777 /ssd/www/bigo-mvp/backend/uploads/streams/screenshots
# Или установите владельца:
chown -R www-data:www-data /ssd/www/bigo-mvp/backend/uploads
```

### Проблема: Скриншоты не отправляются с фронтенда

**Проверьте:**
1. Консоль браузера на наличие ошибок
2. Network tab в DevTools - есть ли запросы к `/api/streams/screenshot`
3. Ответ сервера на запросы

### Проблема: Ошибка 401 (Unauthorized)

**Решение:**
Проверьте, что токен авторизации передается правильно. В логах backend должно быть:
```
[Screenshot Upload] req.user: { id: ... }
```

Если `req.user` отсутствует, проблема с авторизацией.

## Шаги для переноса на локальный сервер (Windows)

### 1. Обновите код

```powershell
cd C:\Users\1\Documents\bigo
git pull origin master
```

### 2. Обновите Backend

```powershell
cd backend
npm install
pm2 restart bigo-backend
```

### 3. Обновите Frontend

```powershell
cd ..\frontend\web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
pm2 restart nio-frontend
```

### 4. Создайте директорию для скриншотов

```powershell
cd C:\Users\1\Documents\bigo
New-Item -ItemType Directory -Force -Path "backend\uploads\streams\screenshots"
```
