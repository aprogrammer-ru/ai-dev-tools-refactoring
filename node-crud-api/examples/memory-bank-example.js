const MemoryBank = require('../memory-bank');

// Пример использования Memory Bank
async function memoryBankExample() {
  console.log('=== Memory Bank Пример ===\n');
  
  // Создание экземпляра Memory Bank
  const bank = new MemoryBank({
    maxSize: 10,           // Максимум 10 записей
    ttl: 5000,             // TTL 5 секунд
    autoCleanup: true,     // Автоматическая очистка
    cleanupInterval: 2000  // Проверять каждые 2 секунды
  });
  
  // Подписка на события
  bank.on('initialized', (info) => {
    console.log('✓ Memory Bank инициализирован:', info);
  });
  
  bank.on('set', (info) => {
    console.log(`✓ Данные сохранены: ${info.key} (размер: ${info.size})`);
  });
  
  bank.on('hit', (info) => {
    console.log(`✓ Данные найдены: ${info.key} (доступов: ${info.accessCount})`);
  });
  
  bank.on('miss', (info) => {
    console.log(`✗ Данные не найдены: ${info.key}${info.reason ? ` (${info.reason})` : ''}`);
  });
  
  bank.on('delete', (info) => {
    console.log(`🗑 Данные удалены: ${info.key} (размер: ${info.size})`);
  });
  
  bank.on('eviction', (info) => {
    console.log(`🔄 Данные вытеснены: ${info.key} (${info.reason})`);
  });
  
  bank.on('cleanup', (info) => {
    console.log(`🧹 Очистка: удалено ${info.expiredCount} устаревших записей`);
  });
  
  bank.on('error', (error) => {
    console.error('❌ Ошибка:', error.message);
  });
  
  // Основной пример
  console.log('\n1. Сохранение данных...');
  
  // Сохранение простых данных
  bank.set('user:1', { id: 1, name: 'Иван', age: 30 });
  bank.set('user:2', { id: 2, name: 'Мария', age: 25 });
  bank.set('config:app', { theme: 'dark', language: 'ru' });
  
  // Сохранение с индивидуальным TTL
  bank.set('session:abc123', { userId: 1, token: 'abc123' }, 3000);
  bank.set('cache:report', { data: 'отчет', generatedAt: Date.now() }, 10000);
  
  console.log('\n2. Получение данных...');
  
  // Получение данных
  const user1 = bank.get('user:1');
  console.log('Пользователь 1:', user1);
  
  const user3 = bank.get('user:3');
  console.log('Пользователь 3:', user3);
  
  console.log('\n3. Проверка существования...');
  console.log('user:1 существует:', bank.has('user:1'));
  console.log('user:3 существует:', bank.has('user:3'));
  
  console.log('\n4. Статистика...');
  const stats = bank.getStats();
  console.log('Статистика:', JSON.stringify(stats, null, 2));
  
  console.log('\n5. Информация о записи...');
  const info = bank.getInfo('user:1');
  console.log('Информация о user:1:', JSON.stringify(info, null, 2));
  
  console.log('\n6. TTL управления...');
  console.log('TTL для session:abc123:', bank.getTTL('session:abc123'), 'мс');
  bank.setTTL('config:app', 8000);
  console.log('Новый TTL для config:app:', bank.getTTL('config:app'), 'мс');
  
  console.log('\n7. Переполнение буфера...');
  // Заполним буфер до предела
  for (let i = 0; i < 12; i++) {
    bank.set(`item:${i}`, { index: i, timestamp: Date.now() });
  }
  
  console.log('\n8. Ожидание истечения TTL...');
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  console.log('\n9. Статистика после истечения TTL...');
  const statsAfter = bank.getStats();
  console.log('Размер:', statsAfter.size);
  console.log('Устаревших:', statsAfter.expiredCount);
  console.log('Ключи:', bank.keys());
  
  console.log('\n10. Работа с коллекциями...');
  
  // Сохранение массива
  bank.set('products', [
    { id: 1, name: 'Ноутбук', price: 1000 },
    { id: 2, name: 'Телефон', price: 500 },
    { id: 3, name: 'Планшет', price: 300 }
  ]);
  
  // Получение и модификация
  const products = bank.get('products');
  if (products) {
    products.push({ id: 4, name: 'Наушники', price: 100 });
    bank.set('products', products);
  }
  
  console.log('Товары:', bank.get('products'));
  
  console.log('\n11. Очистка...');
  bank.clear();
  console.log('Размер после очистки:', bank.getStats().size);
  
  console.log('\n12. Закрытие...');
  bank.close();
  
  console.log('\n=== Пример завершен ===');
}

// Запуск примера
if (require.main === module) {
  memoryBankExample().catch(console.error);
}

module.exports = { memoryBankExample };
