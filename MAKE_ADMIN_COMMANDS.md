# 🔧 Команды для создания администратора

## Пользователь: alexevil@mail.ru

### Вариант 1: Через MongoDB Shell (рекомендуется)

```bash
# На сервере подключись к MongoDB
mongosh "mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp"
```

Затем выполни в MongoDB Shell:

```javascript
use streaming-mvp

// Проверь пользователя
db.users.findOne({ email: "alexevil@mail.ru" })

// Измени роль на admin
db.users.updateOne(
  { email: "alexevil@mail.ru" },
  { $set: { role: "admin" } }
)

// Проверь результат
db.users.findOne({ email: "alexevil@mail.ru" }, { email: 1, role: 1, nickname: 1 })
```

Выйди: `exit`

---

### Вариант 2: Через временный скрипт

```bash
cd /ssd/www/bigo-mvp/backend
sudo nano make-admin.js
```

Вставь:

```javascript
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const email = 'alexevil@mail.ru';
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error('❌ Пользователь не найден!');
      process.exit(1);
    }
    
    user.role = 'admin';
    await user.save();
    
    console.log('✅ Администратор создан!');
    console.log('Email:', user.email);
    console.log('Никнейм:', user.nickname);
    console.log('Роль:', user.role);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
  });
```

Сохрани (`Ctrl+X`, `Y`, `Enter`) и выполни:

```bash
node make-admin.js
sudo rm make-admin.js
```

---

### Вариант 3: Одна команда через mongosh

```bash
mongosh "mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp" --eval 'db.users.updateOne({email: "alexevil@mail.ru"}, {$set: {role: "admin"}})'
```

---

## ✅ Проверка

После выполнения любой из команд проверь:

```bash
mongosh "mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp" --eval 'db.users.findOne({email: "alexevil@mail.ru"}, {email: 1, role: 1, nickname: 1})'
```

Должно показать:
```json
{
  _id: ObjectId("..."),
  email: 'alexevil@mail.ru',
  nickname: '...',
  role: 'admin'
}
```

---

## 🚪 Вход в админку

После этого можешь войти в админку:
- URL: `https://bigo-admin.vercel.app` (или твой URL)
- Email: `alexevil@mail.ru`
- Пароль: тот же, что использовал при регистрации

Готово! 🎉



