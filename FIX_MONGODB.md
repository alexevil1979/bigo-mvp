# 🔧 Исправление ошибки подключения к MongoDB

## Проблема

Ошибка:
```
❌ Ошибка подключения к MongoDB: MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

Это означает, что backend пытается подключиться к MongoDB на `localhost:27017`, но MongoDB не запущена или недоступна.

---

## ✅ Решение

### Вариант 1: Использовать MongoDB Atlas (рекомендуется)

#### Шаг 1: Создай кластер на MongoDB Atlas

1. Зайди на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Войди в аккаунт (или создай новый)
3. Создай бесплатный кластер (M0 Free)
4. Подожди, пока кластер создастся (2-3 минуты)

#### Шаг 2: Настрой доступ

1. **Database Access:**
   - Создай пользователя БД (Database User)
   - Запомни username и password

2. **Network Access:**
   - Добавь IP адрес: `0.0.0.0/0` (для теста, или добавь IP твоего сервера)
   - Нажми "Add IP Address"

#### Шаг 3: Получи Connection String

1. Нажми "Connect" на кластере
2. Выбери "Connect your application"
3. Скопируй Connection String, он будет вида:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. **Замени `<password>` на реальный пароль** и добавь имя базы:
   ```
   mongodb+srv://username:твой-пароль@cluster0.xxxxx.mongodb.net/streaming-mvp?retryWrites=true&w=majority
   ```

#### Шаг 4: Обнови .env на сервере

```bash
# На сервере
ssh username@твой-ip-адрес
cd /var/www/bigo-mvp/backend
sudo nano .env
```

Найди строку `MONGODB_URI` и замени на:

```env
MONGODB_URI=mongodb+srv://username:твой-пароль@cluster0.xxxxx.mongodb.net/streaming-mvp?retryWrites=true&w=majority
```

**Важно:** Замени `username`, `твой-пароль` и `cluster0.xxxxx` на реальные значения!

Сохрани: `Ctrl+X`, `Y`, `Enter`

#### Шаг 5: Перезапусти Backend

```bash
pm2 restart bigo-backend
pm2 logs bigo-backend --lines 30
```

**Ожидаемый результат:**
```
✅ MongoDB подключена
🚀 Сервер запущен на порту 5000
```

---

### Вариант 2: Установить MongoDB локально на сервере

#### Шаг 1: Установка MongoDB

```bash
# На сервере
ssh username@твой-ip-адрес

# Импорт ключа
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Добавление репозитория
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Обновление и установка
sudo apt update
sudo apt install -y mongodb-org
```

#### Шаг 2: Запуск MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Шаг 3: Проверка

```bash
sudo systemctl status mongod
```

Должен быть статус `active (running)`

#### Шаг 4: Обнови .env (если нужно)

Если в `.env` уже указано `mongodb://localhost:27017/streaming-mvp`, то ничего менять не нужно.

Перезапусти backend:

```bash
pm2 restart bigo-backend
```

---

## 🔍 Проверка текущих настроек

На сервере выполни:

```bash
cd /var/www/bigo-mvp/backend
cat .env | grep MONGODB_URI
```

Покажет текущий Connection String.

---

## ✅ Проверка работы

После перезапуска проверь логи:

```bash
pm2 logs bigo-backend --lines 20
```

Должно быть:
```
✅ MongoDB подключена
🚀 Сервер запущен на порту 5000
📡 WebSocket сервер готов для подключений
```

**НЕ должно быть:**
- ❌ Ошибка подключения к MongoDB
- ❌ ECONNREFUSED
- ❌ Operation buffering timed out

---

## 🐛 Если все еще не работает

### Проверь Connection String

```bash
# На сервере
cd /var/www/bigo-mvp/backend
cat .env | grep MONGODB_URI
```

Убедись, что:
- Пароль правильный (без `<` и `>`)
- Имя базы данных указано: `/streaming-mvp`
- Нет лишних пробелов

### Проверь доступность MongoDB Atlas

```bash
# Проверь, что можешь подключиться
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/streaming-mvp"
```

Если не работает, проверь:
- Правильность пароля
- IP адрес добавлен в Network Access
- Кластер запущен (не приостановлен)

### Проверь локальную MongoDB

```bash
# Проверь статус
sudo systemctl status mongod

# Проверь подключение
mongosh
# или
mongo
```

Если не работает:
```bash
# Запусти MongoDB
sudo systemctl start mongod

# Проверь логи
sudo journalctl -u mongod -n 50
```

---

## 📝 Пример правильного .env

### Для MongoDB Atlas:

```env
PORT=5000
MONGODB_URI=mongodb+srv://myuser:mypassword123@cluster0.abc123.mongodb.net/streaming-mvp?retryWrites=true&w=majority
JWT_SECRET=твой-секрет
JWT_EXPIRE=7d
CORS_ORIGIN=https://bigo-mvp.vercel.app,https://api.bigo.1tlt.ru
NODE_ENV=production
```

### Для локальной MongoDB:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/streaming-mvp
JWT_SECRET=твой-секрет
JWT_EXPIRE=7d
CORS_ORIGIN=https://bigo-mvp.vercel.app,https://api.bigo.1tlt.ru
NODE_ENV=production
```

---

## 🚀 Готово!

После исправления:
1. MongoDB должна подключиться
2. Регистрация должна работать
3. Вход должен работать
4. Все API endpoints должны работать

Проверь в логах: `✅ MongoDB подключена` - это значит, что все работает! 🎉



