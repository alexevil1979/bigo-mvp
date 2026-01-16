// Скрипт для удаления дублирующегося индекса transactionId
const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/streaming-mvp';

async function removeDuplicateIndex() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Подключено к MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('payments');

    // Получаем все индексы
    const indexes = await collection.indexes();
    console.log('Текущие индексы:', indexes);

    // Удаляем дублирующийся индекс transactionId_1 (если он существует отдельно от unique)
    // unique индекс создается автоматически и имеет имя transactionId_1
    // Если есть еще один индекс с таким же именем, это проблема
    
    // Проверяем, есть ли дублирующийся индекс
    const transactionIdIndexes = indexes.filter(idx => 
      idx.key && idx.key.transactionId !== undefined
    );
    
    console.log('Индексы на transactionId:', transactionIdIndexes);

    // Если есть более одного индекса на transactionId, удаляем лишние
    if (transactionIdIndexes.length > 1) {
      // Оставляем unique индекс, удаляем остальные
      for (let i = 1; i < transactionIdIndexes.length; i++) {
        const indexName = transactionIdIndexes[i].name;
        if (indexName !== 'transactionId_1') {
          await collection.dropIndex(indexName);
          console.log(`✅ Удален индекс: ${indexName}`);
        }
      }
    }

    console.log('✅ Готово!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

removeDuplicateIndex();



