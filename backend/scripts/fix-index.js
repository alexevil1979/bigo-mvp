// Простой скрипт для удаления дублирующегося индекса transactionId
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/streaming-mvp';

async function fixIndex() {
  try {
    console.log('Подключение к MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Подключено к MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('payments');

    // Получаем все индексы
    const indexes = await collection.indexes();
    console.log('\nТекущие индексы:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Ищем индексы на transactionId
    const transactionIdIndexes = indexes.filter(idx => 
      idx.key && idx.key.transactionId !== undefined
    );
    
    console.log(`\nНайдено индексов на transactionId: ${transactionIdIndexes.length}`);
    
    // Если есть только один индекс (unique), все хорошо
    if (transactionIdIndexes.length === 1) {
      console.log('✅ Дублирующихся индексов не найдено. Все в порядке!');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Если больше одного - удаляем лишние (оставляем только unique)
    console.log('\nУдаление дублирующихся индексов...');
    for (const idx of transactionIdIndexes) {
      // Оставляем unique индекс (обычно он называется transactionId_1)
      if (idx.unique) {
        console.log(`  ✓ Оставляем unique индекс: ${idx.name}`);
      } else {
        // Удаляем не-unique дубликаты
        try {
          await collection.dropIndex(idx.name);
          console.log(`  ✓ Удален дублирующийся индекс: ${idx.name}`);
        } catch (err) {
          console.log(`  ⚠ Не удалось удалить ${idx.name}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Готово!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

fixIndex();



