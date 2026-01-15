# Полное исправление ошибок SEO и prerender-manifest.json

## Проблема

1. Ошибка `ReferenceError: SEO is not defined` при сборке
2. Ошибка `ENOENT: prerender-manifest.json` при запуске Next.js

## Решение (выполните ВСЕ шаги по порядку)

### Шаг 1: Обновите код из репозитория

```bash
# Перейдите в корневую директорию проекта
cd /ssd/www/bigo-mvp

# Разрешите конфликт (если есть)
git checkout -- backend/scripts/setup-turn.sh

# Обновите код
git pull origin master
```

**Проверка:** Убедитесь, что файл `frontend/web/pages/index.js` содержит строку:
```javascript
import SEO from '../components/SEO';
```

Проверить можно командой:
```bash
grep "import SEO" /ssd/www/bigo-mvp/frontend/web/pages/index.js
```

Должна быть строка: `import SEO from '../components/SEO';`

### Шаг 2: Остановите PM2

```bash
pm2 stop nio-frontend
```

**Важно:** PM2 должен быть остановлен перед сборкой!

### Шаг 3: Перейдите в директорию фронтенда

```bash
cd /ssd/www/bigo-mvp/frontend/web
```

### Шаг 4: Полная очистка

```bash
# Удалите старую сборку
rm -rf .next

# Удалите node_modules (опционально, если есть проблемы)
# rm -rf node_modules package-lock.json
```

### Шаг 5: Установите зависимости (если удаляли node_modules)

```bash
npm install
```

### Шаг 6: Выполните сборку

```bash
npm run build
```

**КРИТИЧЕСКИ ВАЖНО:** Дождитесь полного завершения сборки!

**Успешная сборка должна показать:**
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (25/25)
```

**НЕ должно быть:**
- `ReferenceError: SEO is not defined`
- `Error occurred prerendering page "/"`
- `Export encountered errors`

### Шаг 7: Проверьте наличие файла

```bash
ls -la .next/prerender-manifest.json
```

**Файл должен существовать!** Если его нет, сборка не завершилась успешно.

### Шаг 8: Проверьте другие необходимые файлы

```bash
ls -la .next/
```

Должны быть:
- `BUILD_ID`
- `prerender-manifest.json`
- `routes-manifest.json`
- `server/` (директория)
- `static/` (директория)

### Шаг 9: Только после успешной сборки - запустите PM2

```bash
pm2 restart nio-frontend
```

**Важно:** Запускайте PM2 ТОЛЬКО после успешной сборки!

### Шаг 10: Проверьте логи

```bash
pm2 logs nio-frontend --lines 50
```

**Не должно быть:**
- `ENOENT: prerender-manifest.json`
- `SEO is not defined`
- Других ошибок

**Должно быть:**
- `ready - started server on 0.0.0.0:3000`
- Или подобное сообщение об успешном запуске

## Если сборка все еще падает с ошибкой SEO

### Проверьте импорт вручную

```bash
# Проверьте, что импорт есть
cat /ssd/www/bigo-mvp/frontend/web/pages/index.js | grep "import SEO"
```

Если импорта нет, добавьте его вручную:

```bash
# Откройте файл
nano /ssd/www/bigo-mvp/frontend/web/pages/index.js

# Найдите строку с другими импортами (около строки 9-10)
# Добавьте после других импортов:
import SEO from '../components/SEO';

# Сохраните (Ctrl+O, Enter, Ctrl+X)
```

### Проверьте, что компонент SEO существует

```bash
ls -la /ssd/www/bigo-mvp/frontend/web/components/SEO.js
```

Файл должен существовать!

## Если сборка завершается, но файл не создается

### Проверьте права доступа

```bash
# Проверьте права на директорию
ls -la /ssd/www/bigo-mvp/frontend/web/.next/

# Если нужно, измените права
chown -R $(whoami):$(whoami) /ssd/www/bigo-mvp/frontend/web/.next
```

### Проверьте место на диске

```bash
df -h
```

Убедитесь, что есть достаточно свободного места (минимум 1GB).

### Полная переустановка

```bash
cd /ssd/www/bigo-mvp/frontend/web

pm2 stop nio-frontend

# Полная очистка
rm -rf .next node_modules package-lock.json

# Очистка кэша
npm cache clean --force

# Переустановка
npm install

# Пересборка
npm run build

# Проверка
ls -la .next/prerender-manifest.json

# Запуск
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
pm2 logs nio-frontend --lines 30
```

Не должно быть ошибок.

### 3. Проверьте доступность локально

```bash
curl http://localhost:3000
```

Должен вернуться HTML без ошибок.

### 4. Проверьте через браузер

Откройте `https://bigo.1tlt.ru` - сайт должен загружаться без ошибок.

## Быстрая команда (все в одном)

Если вы уверены, что код обновлен, выполните:

```bash
cd /ssd/www/bigo-mvp && \
git checkout -- backend/scripts/setup-turn.sh && \
git pull origin master && \
cd frontend/web && \
pm2 stop nio-frontend && \
rm -rf .next && \
npm run build && \
ls -la .next/prerender-manifest.json && \
pm2 restart nio-frontend && \
pm2 logs nio-frontend --lines 30
```

**Важно:** Проверьте каждый шаг! Если сборка падает, не запускайте PM2.

## Готово!

После выполнения всех шагов:
- ✅ Код обновлен из репозитория
- ✅ Импорт SEO исправлен
- ✅ Next.js пересобран успешно
- ✅ Файл prerender-manifest.json создан
- ✅ PM2 запущен без ошибок
- ✅ Сайт работает

