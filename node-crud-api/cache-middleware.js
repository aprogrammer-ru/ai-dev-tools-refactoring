const MemoryBank = require('./memory-bank');

/**
 * Middleware для кэширования данных в API
 * Интегрирует Memory Bank с Express для ускорения работы API
 */
class CacheMiddleware {
  constructor(options = {}) {
    this.cache = new MemoryBank({
      maxSize: options.maxSize || 100,
      ttl: options.ttl || 300000, // 5 минут по умолчанию
      autoCleanup: true,
      cleanupInterval: 60000
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Подписка на события кэша
    this.cache.on('hit', () => this.stats.hits++);
    this.cache.on('miss', () => this.stats.misses++);
    this.cache.on('set', () => this.stats.sets++);
    this.cache.on('delete', () => this.stats.deletes++);
  }
  
  /**
   * Express middleware для кэширования GET запросов
   * @param {string} keyGenerator - Функция генерации ключа кэша
   * @param {number} ttl - TTL в миллисекундах (опционально)
   */
  cacheGet(keyGenerator, ttl = null) {
    return (req, res, next) => {
      const cacheKey = typeof keyGenerator === 'function' 
        ? keyGenerator(req) 
        : this._generateKey(req, keyGenerator);
      
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cached);
      }
      
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      
      // Сохраняем оригинальный метод json
      const originalJson = res.json;
      
      // Переопределяем метод json для сохранения в кэш
      res.json = (data) => {
        // Сохраняем в кэш только успешные ответы
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.cache.set(cacheKey, data, ttl);
        }
        return originalJson.call(res, data);
      };
      
      next();
    };
  }
  
  /**
   * Express middleware для инвалидации кэша при изменениях
   * @param {Array|string} keys - Ключи или функция генерации ключей для инвалидации
   */
  invalidateCache(keys) {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = (data) => {
        // Инвалидируем кэш только при успешных изменениях
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this._invalidateKeys(req, keys);
        }
        return originalJson.call(res, data);
      };
      
      next();
    };
  }
  
  /**
   * Ручное сохранение в кэш
   * @param {string} key - Ключ
   * @param {*} data - Данные
   * @param {number} ttl - TTL в миллисекундах
   */
  set(key, data, ttl = null) {
    return this.cache.set(key, data, ttl);
  }
  
  /**
   * Получение из кэша
   * @param {string} key - Ключ
   * @returns {*} - Данные
   */
  get(key) {
    return this.cache.get(key);
  }
  
  /**
   * Удаление из кэша
   * @param {string} key - Ключ
   */
  delete(key) {
    return this.cache.delete(key);
  }
  
  /**
   * Очистка кэша
   */
  clear() {
    return this.cache.clear();
  }
  
  /**
   * Получение статистики
   * @returns {Object} - Статистика
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      cache: cacheStats,
      hitRate: (this.stats.hits / Math.max(1, this.stats.hits + this.stats.misses)) * 100
    };
  }
  
  /**
   * Генерация ключа кэша на основе запроса
   * @param {Object} req - Express request
   * @param {string} prefix - Префикс ключа
   * @returns {string} - Ключ кэша
   */
  _generateKey(req, prefix = '') {
    const method = req.method.toUpperCase();
    const path = req.path;
    const query = JSON.stringify(req.query || {});
    const key = `${prefix}${method}:${path}${query}`;
    return key;
  }
  
  /**
   * Инвалидация ключей кэша
   * @param {Object} req - Express request
   * @param {Array|string|Function} keys - Ключи для инвалидации
   */
  _invalidateKeys(req, keys) {
    if (typeof keys === 'function') {
      keys = keys(req);
    }
    
    if (typeof keys === 'string') {
      keys = [keys];
    }
    
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        if (typeof key === 'string') {
          this.cache.delete(key);
        } else if (typeof key === 'function') {
          const generatedKey = key(req);
          if (generatedKey) {
            this.cache.delete(generatedKey);
          }
        }
      });
    }
  }
  
  /**
   * Закрытие кэша
   */
  close() {
    this.cache.close();
  }
}

// Создание экземпляра middleware
const cacheMiddleware = new CacheMiddleware({
  maxSize: 200,
  ttl: 300000 // 5 минут
});

module.exports = cacheMiddleware;
