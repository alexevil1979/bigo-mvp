# Исправление ошибки ENOENT: prerender-manifest.json

## Проблема

Next.js не может найти файл `prerender-manifest.json` в директории `.next`:

```
Error: ENOENT: no such file or directory, open '/ssd/www/bigo-mvp/frontend/web/.next/prerender-manifest.json'
```

## Причина

Файл `prerender-manifest.json` создается во время сборки Next.js. Если его нет, значит:
- Сборка не была выполнена
- Сборка была прервана
- Файл был удален
- Сборка была выполнена с ошибками

## Решение

### Шаг 1: Остановите PM2 процесс

```bash
pm2 stop nio-frontend
```

### Шаг 2: Перейдите в директорию фронтенда

```bash
cd /ssd/www/bigo-mvp/frontend/web
```

### Шаг 3: Удалите старую сборку

```bash
rm -rf .next
```

**Важно:** Удаление директории `.next` заставит Next.js выполнить полную пересборку.

### Шаг 4: Проверьте зависимости

```bash
# Убедитесь, что все зависимости установлены
npm install
```

### Шаг 5: Выполните полную пересборку

```bash
npm run build
```

**Ожидаемый результат:**
```
> next build

Creating an optimized production build...
Compiled successfully.

Route (app)                              Size     First Load JS
┌ ○ /                                    5.45 kB        87.3 kB
└ ○ /404                                 194 B          82.1 kB
...

○  (Static)  prerendered as static content
```

**Важно:** Дождитесь завершения сборки. Это может занять 1-3 минуты.

### Шаг 6: Проверьте наличие файла

```bash
ls -la .next/prerender-manifest.json
```

Файл должен существовать. Если его нет, сборка не завершилась успешно.

### Шаг 7: Проверьте другие необходимые файлы

```bash
ls -la .next/
```

Должны быть файлы:
- `BUILD_ID`
- `prerender-manifest.json`
- `routes-manifest.json`
- `server/`
- `static/`

### Шаг 8: Запустите PM2 снова

```bash
pm2 restart nio-frontend
```

### Шаг 9: Проверьте логи

```bash
pm2 logs nio-frontend --lines 30
```

Не должно быть ошибок `ENOENT: prerender-manifest.json`.

## Если сборка не завершается успешно

### Проверьте ошибки сборки

```bash
cd /ssd/www/bigo-mvp/frontend/web
npm run build 2>&1 | tee build.log
```

Изучите файл `build.log` на наличие ошибок.

### Частые проблемы при сборке

#### 1. Недостаточно памяти

**Симптом:** Сборка падает с ошибкой памяти.

**Решение:**
```bash
# Увеличьте лимит памяти Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### 2. Ошибки в коде

**Симптом:** Ошибки компиляции TypeScript/JavaScript.

**Решение:**
- Исправьте ошибки в коде
- Проверьте синтаксис всех файлов
- Убедитесь, что все импорты корректны

#### 3. Отсутствующие зависимости

**Симптом:** `Cannot find module '...'`

**Решение:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 4. Проблемы с переменными окружения

**Симптом:** Ошибки при обращении к `process.env.NEXT_PUBLIC_*`

**Решение:**
Убедитесь, что файл `.env.local` или `.env.production` существует и содержит все необходимые переменные:

```bash
cat .env.local
# или
cat .env.production
```

## Альтернативное решение: Принудительная пересборка

Если стандартная пересборка не помогает:

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2
pm2 stop nio-frontend

# Полная очистка
rm -rf .next node_modules package-lock.json

# Очистка кэша npm
npm cache clean --force

# Переустановка зависимостей
npm install

# Пересборка
npm run build

# Проверка файла
ls -la .next/prerender-manifest.json

# Запуск PM2
pm2 restart nio-frontend
```

## Проверка после исправления

### 1. Проверьте статус PM2

```bash
pm2 status
```

Процесс `nio-frontend` должен быть `online`.

### 2. Проверьте логи

```bash
pm2 logs nio-frontend --lines 20
```

Не должно быть ошибок `ENOENT`.

### 3. Проверьте доступность

```bash
curl http://localhost:3000
```

Должен вернуться HTML без ошибок.

### 4. Проверьте через браузер

Откройте `https://bigo.1tlt.ru` - сайт должен загружаться без ошибок.

## Профилактика

Чтобы избежать этой проблемы в будущем:

1. **Всегда выполняйте полную сборку перед запуском:**
   ```bash
   npm run build
   pm2 restart nio-frontend
   ```

2. **Не удаляйте директорию `.next` вручную** без последующей пересборки.

3. **Используйте скрипт деплоя:**
   ```bash
   # Создайте скрипт deploy.sh
   #!/bin/bash
   cd /ssd/www/bigo-mvp/frontend/web
   npm install
   npm run build
   pm2 restart nio-frontend
   ```

4. **Проверяйте логи после деплоя:**
   ```bash
   pm2 logs nio-frontend --lines 50
   ```

## Если проблема сохраняется

1. Проверьте версию Node.js:
   ```bash
   node -v
   ```
   Должна быть версия 18.17.0 или выше.

2. Проверьте версию Next.js:
   ```bash
   cd /ssd/www/bigo-mvp/frontend/web
   npm list next
   ```

3. Проверьте права доступа:
   ```bash
   ls -la /ssd/www/bigo-mvp/frontend/web/.next/
   ```
   Убедитесь, что у пользователя, от которого запущен PM2, есть права на чтение/запись.

4. Проверьте место на диске:
   ```bash
   df -h
   ```
   Убедитесь, что есть достаточно свободного места.

## Готово!

После выполнения всех шагов ошибка `ENOENT: prerender-manifest.json` должна исчезнуть, и Next.js приложение будет работать корректно.

