# Memory Bank - Система управления данными в памяти

Memory Bank - это высокопроизводительная система управления данными в оперативной памяти для Node.js приложений. Она предоставляет удобный интерфейс для хранения, извлечения и управления данными с поддержкой TTL, автоматической очистки и статистики использования.

## Особенности

- ✅ **Быстрый доступ** - Использует Map для O(1) операций
- ✅ **TTL поддержка** - Автоматическое удаление устаревших данных
- ✅ **Автоматическая очистка** - Фоновое удаление просроченных записей
- ✅ **Контроль памяти** - Ограничение размера и вытеснение по FIFO
- ✅ **Статистика** - Подробная статистика использования и производительности
- ✅ **События** - Полный набор событий для мониторинга
- ✅ **Гибкость** - Поддержка индивидуальных TTL для каждой записи

## Установка

Memory Bank уже включен в проект. Для использования:

```javascript
const MemoryBank = require('./node-crud-api/memory-bank');
```

## Быстрый старт

```javascript
const MemoryBank = require('./node-crud-api/memory-bank');

// Создание экземпляра
const bank = new MemoryBank({
  maxSize: 1000,        // Максимум 1000 записей
  ttl: 300000,          // TTL 5 минут
  autoCleanup: true,    // Автоматическая очистка
  cleanupInterval: 60000 // Интервал очистки 1 минута
});

// Сохранение данных
bank.set('user:1', { id: 1, name: 'Иван' });

// Получение данных
const user = bank.get('user:1');

// Проверка существования
if (bank.has('user:1')) {
  console.log('Пользователь существует');
}

// Удаление данных
bank.delete('user:1');

// Закрытие
bank.close();
```

## API

### Конструктор

```javascript
new MemoryBank(options)
```

**Опции:**
- `maxSize` (number) - Максимальное количество записей (по умолчанию: 1000)
- `ttl` (number) - Время жизни записей в миллисекундах (по умолчанию: 0 - бессрочно)
- `autoCleanup` (boolean) - Автоматическая очистка устаревших записей (по умолчанию: true)
- `cleanupInterval` (number) - Интервал фоновой очистки в миллисекундах (по умолчанию: 60000)

### Методы

#### set(key, value, ttl = null)

Сохраняет данные в memory bank.

```javascript
bank.set('key', 'value');                    // Использует TTL по умолчанию
bank.set('key', 'value', 5000);              // TTL 5 секунд
bank.set('user:1', { name: 'Иван' }, 60000); // Объект с TTL 1 минута
```

**Параметры:**
- `key` (string) - Ключ
- `value` (*) - Значение
- `ttl` (number, опционально) - Время жизни в миллисекундах

**Возвращает:** boolean - Успешность операции

#### get(key)

Получает данные из memory bank.

```javascript
const value = bank.get('key');
if (value !== undefined) {
  console.log('Найдено:', value);
}
```

**Параметры:**
- `key` (string) - Ключ

**Возвращает:** (*) - Значение или undefined

#### has(key)

Проверяет существование ключа.

```javascript
if (bank.has('key')) {
  console.log('Ключ существует');
}
```

**Параметры:**
- `key` (string) - Ключ

**Возвращает:** boolean - Существует ли ключ

#### delete(key)

Удаляет данные из memory bank.

```javascript
const deleted = bank.delete('key'); // true/false
```

**Параметры:**
- `key` (string) - Ключ

**Возвращает:** boolean - Успешность операции

#### clear()

Очищает весь memory bank.

```javascript
const count = bank.clear(); // Количество удаленных записей
```

**Возвращает:** number - Количество удаленных записей

#### keys()

Получает все ключи.

```javascript
const keys = bank.keys();
console.log('Все ключи:', keys);
```

**Возвращает:** Array - Массив ключей

#### values()

Получает все значения.

```javascript
const values = bank.values();
console.log('Все значения:', values);
```

**Возвращает:** Array - Массив значений

#### entries()

Получает все записи в виде массива объектов.

```javascript
const entries = bank.entries();
entries.forEach(entry => {
  console.log(`Ключ: ${entry.key}, Значение:`, entry.value);
});
```

**Возвращает:** Array - Массив записей {key, value, metadata}

#### getStats()

Получает статистику использования.

```javascript
const stats = bank.getStats();
console.log('Статистика:', stats);
```

**Возвращает:** Object - Статистика

**Структура статистики:**
```javascript
{
  totalOperations: 100,    // Всего операций
  reads: 60,               // Операций чтения
  writes: 30,              // Операций записи
  deletes: 10,             // Операций удаления
  evictions: 5,            // Вытесненных записей
  hits: 55,                // Успешных чтений
  misses: 5,               // Неудачных чтений
  size: 25,                // Текущий размер
  maxSize: 1000,           // Максимальный размер
  expiredCount: 3,         // Устаревших записей
  hitRate: 91.67           // Процент попаданий
}
```

#### getInfo(key)

Получает подробную информацию о записи.

```javascript
const info = bank.getInfo('key');
console.log('Информация:', info);
```

**Параметры:**
- `key` (string) - Ключ

**Возвращает:** Object|null - Информация о записи

**Структура информации:**
```javascript
{
  key: 'key',
  value: 'value',
  metadata: {
    createdAt: 1234567890,
    ttl: 5000,
    expiresAt: 1234567895,
    accessCount: 3,
    lastAccess: 1234567894,
    isExpired: false
  }
}
```

#### setTTL(key, ttl)

Устанавливает TTL для существующей записи.

```javascript
bank.setTTL('key', 10000); // TTL 10 секунд
```

**Параметры:**
- `key` (string) - Ключ
- `ttl` (number) - Время жизни в миллисекундах

**Возвращает:** boolean - Успешность операции

#### getTTL(key)

Получает оставшееся время жизни записи.

```javascript
const remaining = bank.getTTL('key'); // 5000 (мс) или null
```

**Параметры:**
- `key` (string) - Ключ

**Возвращает:** number|null - Оставшееся время в миллисекундах или null

#### close()

Закрывает memory bank и останавливает фоновые процессы.

```javascript
bank.close();
```

## События

Memory Bank генерирует события для мониторинга:

```javascript
bank.on('initialized', (info) => {
  console.log('Инициализирован:', info);
});

bank.on('set', (info) => {
  console.log('Сохранено:', info.key, 'размер:', info.size);
});

bank.on('hit', (info) => {
  console.log('Попадание:', info.key, 'доступов:', info.accessCount);
});

bank.on('miss', (info) => {
  console.log('Промах:', info.key, 'причина:', info.reason);
});

bank.on('delete', (info) => {
  console.log('Удалено:', info.key, 'размер:', info.size);
});

bank.on('eviction', (info) => {
  console.log('Вытеснено:', info.key, 'причина:', info.reason);
});

bank.on('cleanup', (info) => {
  console.log('Очистка:', info.expiredCount, 'записей');
});

bank.on('error', (error) => {
  console.error('Ошибка:', error.message);
});
```

**Доступные события:**
- `initialized` - Инициализация завершена
- `set` - Данные сохранены
- `hit` - Успешное чтение
- `miss` - Неудачное чтение
- `delete` - Данные удалены
- `eviction` - Данные вытеснены
- `cleanup` - Фоновая очистка
- `error` - Ошибка
- `ttlUpdated` - TTL обновлен
- `closed` - Memory Bank закрыт

## Использование с Express (Кэширование API)

Memory Bank поставляется с middleware для кэширования Express API:

```javascript
const cacheMiddleware = require('./node-crud-api/cache-middleware');

// Кэширование GET запросов
app.get('/api/products', 
  cacheMiddleware.cacheGet('products'),
  (req, res) => {
    // Ваш код обработки
    res.json(products);
  }
);

// Инвалидация кэша при изменениях
app.post('/api/products',
  (req, res) => {
    // Создание продукта
  },
  cacheMiddleware.invalidateCache(['products'])
);
```

### Методы middleware

#### cacheGet(keyGenerator, ttl = null)

Middleware для кэширования GET запросов.

```javascript
// Простое кэширование
cacheMiddleware.cacheGet('products');

// Кэширование с функцией генерации ключа
cacheMiddleware.cacheGet((req) => {
  return `products:${req.query.category}`;
});

// Кэширование с индивидуальным TTL
cacheMiddleware.cacheGet('products', 60000); // 1 минута
```

#### invalidateCache(keys)

Middleware для инвалидации кэша при изменениях.

```javascript
// Инвалидация по строке
cacheMiddleware.invalidateCache('products');

// Инвалидация по массиву
cacheMiddleware.invalidateCache(['products', 'categories']);

// Инвалидация по функции
cacheMiddleware.invalidateCache((req) => {
  return [`products:${req.params.id}`, 'products'];
});
```

#### getStats()

Получение статистики кэширования.

```javascript
const stats = cacheMiddleware.getStats();
console.log('Статистика кэша:', stats);
```

## Примеры использования

### 1. Кэширование результатов вычислений

```javascript
const bank = new MemoryBank({ ttl: 600000 }); // 10 минут

function expensiveCalculation(n) {
  const cacheKey = `calc:${n}`;
  
  // Проверка кэша
  let result = bank.get(cacheKey);
  if (result !== undefined) {
    return result;
  }
  
  // Выполнение вычислений
  result = slowFibonacci(n);
  
  // Сохранение в кэш
  bank.set(cacheKey, result);
  
  return result;
}
```

### 2. Кэширование данных пользователя

```javascript
const userCache = new MemoryBank({ 
  maxSize: 500,
  ttl: 300000 // 5 минут
});

async function getUser(id) {
  const cacheKey = `user:${id}`;
  
  // Проверка кэша
  let user = userCache.get(cacheKey);
  if (user) {
    return user;
  }
  
  // Загрузка из БД
  user = await db.getUser(id);
  
  // Сохранение в кэш
  if (user) {
    userCache.set(cacheKey, user);
  }
  
  return user;
}
```

### 3. Сессионное хранилище

```javascript
const sessionStore = new MemoryBank({ 
  ttl: 1800000 // 30 минут
});

function createSession(userId) {
  const sessionId = generateSessionId();
  const session = {
    userId,
    createdAt: Date.now(),
    lastAccess: Date.now()
  };
  
  sessionStore.set(`session:${sessionId}`, session);
  return sessionId;
}

function getSession(sessionId) {
  const session = sessionStore.get(`session:${sessionId}`);
  if (session) {
    session.lastAccess = Date.now();
    sessionStore.set(`session:${sessionId}`, session);
  }
  return session;
}
```

### 4. Rate limiting

```javascript
const rateLimit = new MemoryBank({ 
  maxSize: 10000,
  ttl: 60000 // 1 минута
});

function checkRateLimit(ip, limit = 100) {
  const key = `rate:${ip}`;
  let requests = rateLimit.get(key) || 0;
  
  if (requests >= limit) {
    return false; // Лимит превышен
  }
  
  rateLimit.set(key, requests + 1);
  return true;
}
```

## Производительность

Memory Bank оптимизирован для высокой производительности:

- **O(1) операции** - Все основные операции выполняются за константное время
- **Эффективное использование памяти** - Минимальные накладные расходы
- **Автоматическая очистка** - Фоновое удаление устаревших данных
- **Контроль роста** - Автоматическое вытеснение при переполнении

## Безопасность

- **Изоляция данных** - Каждый экземпляр работает независимо
- **Контроль памяти** - Ограничение размера предотвращает утечки
- **Обработка ошибок** - Все операции безопасны и не вызывают исключений

## Тестирование

Запуск примера:

```bash
node node-crud-api/examples/memory-bank-example.js
```

## Лучшие практики

1. **Выбор TTL** - Устанавливайте разумный TTL в зависимости от типа данных
2. **Контроль размера** - Ограничивайте размер в соответствии с доступной памятью
3. **Мониторинг** - Используйте статистику для анализа эффективности
4. **Именование ключей** - Используйте понятные и уникальные ключи
5. **Обработка ошибок** - Всегда проверяйте результаты операций

## Лицензия

MIT License
