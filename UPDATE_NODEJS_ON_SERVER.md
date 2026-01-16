# Обновление Node.js на сервере

## Проблема

```
You are using Node.js 16.20.2. For Next.js, Node.js version >= v18.17.0 is required.
```

## Решение: Обновление Node.js

### Вариант 1: Использование NVM (рекомендуется)

#### Шаг 1: Установите NVM (если еще не установлен)

```bash
# Скачайте и установите NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезагрузите shell или выполните:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

#### Шаг 2: Установите Node.js 18 или 20

```bash
# Установите Node.js 20 LTS (рекомендуется)
nvm install 20

# Или установите Node.js 18 LTS
nvm install 18

# Используйте установленную версию
nvm use 20
# или
nvm use 18

# Сделайте версию по умолчанию
nvm alias default 20
# или
nvm alias default 18

# Проверьте версию
node -v
# Должно быть: v20.x.x или v18.x.x
```

#### Шаг 3: Обновите PM2 для использования новой версии Node.js

```bash
# Переустановите PM2 с новой версией Node.js
npm install -g pm2

# Или просто перезапустите PM2
pm2 kill
pm2 resurrect
```

### Вариант 2: Использование NodeSource (альтернатива)

#### Шаг 1: Добавьте репозиторий NodeSource

```bash
# Для Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Или для Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```

#### Шаг 2: Установите Node.js

```bash
sudo apt-get install -y nodejs

# Проверьте версию
node -v
npm -v
```

#### Шаг 3: Обновите PM2

```bash
sudo npm install -g pm2
```

### Вариант 3: Использование Snap (быстрый способ)

```bash
# Удалите старую версию (если установлена через snap)
sudo snap remove node

# Установите Node.js 20
sudo snap install node --classic --channel=20

# Проверьте версию
node -v
```

## После обновления Node.js

### Шаг 1: Переустановите зависимости

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Удалите старые зависимости
rm -rf node_modules package-lock.json

# Очистите кэш npm
npm cache clean --force

# Переустановите зависимости
npm install
```

### Шаг 2: Пересоберите Next.js

```bash
# Удалите старую сборку
rm -rf .next

# Выполните сборку
npm run build

# Проверьте, что сборка завершилась успешно
ls -la .next/BUILD_ID
```

### Шаг 3: Перезапустите PM2

```bash
# Остановите PM2
pm2 stop nio-frontend

# Удалите из PM2
pm2 delete nio-frontend

# Перезапустите с новой версией Node.js
cd /ssd/www/bigo-mvp/frontend/web
pm2 start ecosystem.config.js

# Или если используете npm start:
pm2 start npm --name "nio-frontend" -- start

# Сохраните конфигурацию
pm2 save

# Проверьте статус
pm2 status
```

## Быстрое исправление (NVM)

```bash
# 1. Установите NVM (если не установлен)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. Установите Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# 3. Проверьте версию
node -v
# Должно быть: v20.x.x

# 4. Переустановите зависимости
cd /ssd/www/bigo-mvp/frontend/web
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 5. Пересоберите
rm -rf .next
npm run build

# 6. Перезапустите PM2
pm2 stop nio-frontend
pm2 delete nio-frontend
pm2 start ecosystem.config.js
pm2 save

# 7. Проверьте статус
pm2 status
pm2 logs nio-frontend --lines 30
```

## Проверка после обновления

1. **Проверьте версию Node.js:**
   ```bash
   node -v
   ```
   Должна быть >= 18.17.0

2. **Проверьте сборку:**
   ```bash
   ls -la /ssd/www/bigo-mvp/frontend/web/.next/BUILD_ID
   ```
   Файл должен существовать.

3. **Проверьте статус PM2:**
   ```bash
   pm2 status
   ```
   Процесс должен быть `online`.

4. **Проверьте логи:**
   ```bash
   pm2 logs nio-frontend --lines 30
   ```
   Не должно быть ошибок о версии Node.js.

5. **Проверьте сайт:**
   Откройте `https://bigo.1tlt.ru` - должно работать без ошибок 503.

## Если NVM не работает в PM2

PM2 может использовать системную версию Node.js. Чтобы PM2 использовал версию из NVM:

```bash
# Найдите путь к Node.js из NVM
which node
# Например: /root/.nvm/versions/node/v20.11.0/bin/node

# Обновите ecosystem.config.js, добавив:
# interpreter: '/root/.nvm/versions/node/v20.11.0/bin/node'

# Или установите Node.js глобально через NodeSource
```

## Готово!

После обновления Node.js и пересборки Next.js приложение должно работать нормально.



