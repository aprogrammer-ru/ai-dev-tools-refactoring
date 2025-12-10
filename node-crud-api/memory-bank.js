const EventEmitter = require('events');

/**
 * Memory Bank - система управления данными в памяти
 * Предоставляет интерфейс для хранения, извлечения и управления данными в оперативной памяти
 */
class MemoryBank extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxSize: options.maxSize || 1000, // Максимальное количество записей
      ttl: options.ttl || 0, // Время жизни записей в миллисекундах (0 - бессрочно)
      autoCleanup: options.autoCleanup !== false, // Автоматическая очистка устаревших записей
      cleanupInterval: options.cleanupInterval || 60000, // Интервал очистки в миллисекундах (1 минута)
      ...options
    };
    
    // Основное хранилище данных
    this.data = new Map();
    
    // Хранилище метаданных (время создания, TTL и т.д.)
    this.metadata = new Map();
    
    // Счетчики
    this.stats = {
      totalOperations: 0,
      reads: 0,
      writes: 0,
      deletes: 0,
      evictions: 0,
      hits: 0,
      misses: 0
    };
    
    // Запуск фоновой очистки
    if (this.options.autoCleanup && this.options.ttl > 0) {
      this._startCleanupTimer();
    }
    
    this.emit('initialized', {
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      autoCleanup: this.options.autoCleanup
    });
  }
  
  /**
   * Сохранить данные в memory bank
   * @param {string} key - Ключ
   * @param {*} value - Значение
   * @param {number} ttl - Время жизни в миллисекундах (опционально)
   * @returns {boolean} - Успешность операции
   */
  set(key, value, ttl = null) {
    try {
      this.stats.totalOperations++;
      this.stats.writes++;
      
      // Проверка ограничения размера
      if (this.data.size >= this.options.maxSize && !this.data.has(key)) {
        this._evictOldest();
      }
      
      // Определение TTL
      const effectiveTtl = ttl !== null ? ttl : this.options.ttl;
      const now = Date.now();
      
      // Сохранение данных
      this.data.set(key, value);
      
      // Сохранение метаданных
      this.metadata.set(key, {
        createdAt: now,
        ttl: effectiveTtl,
        expiresAt: effectiveTtl > 0 ? now + effectiveTtl : null,
        accessCount: 0,
        lastAccess: now
      });
      
      this.emit('set', { key, size: this.data.size });
      
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }
  
  /**
   * Получить данные из memory bank
   * @param {string} key - Ключ
   * @returns {*} - Значение или undefined
   */
  get(key) {
    try {
      this.stats.totalOperations++;
      this.stats.reads++;
      
      // Проверка существования
      if (!this.data.has(key)) {
        this.stats.misses++;
        this.emit('miss', { key });
        return undefined;
      }
      
      const metadata = this.metadata.get(key);
      
      // Проверка срока действия
      if (metadata.expiresAt && Date.now() > metadata.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        this.emit('miss', { key, reason: 'expired' });
        return undefined;
      }
      
      // Обновление статистики доступа
      metadata.accessCount++;
      metadata.lastAccess = Date.now();
      this.metadata.set(key, metadata);
      
      this.stats.hits++;
      this.emit('hit', { key, accessCount: metadata.accessCount });
      
      return this.data.get(key);
    } catch (error) {
      this.emit('error', error);
      return undefined;
    }
  }
  
  /**
   * Проверить существование ключа
   * @param {string} key - Ключ
   * @returns {boolean} - Существует ли ключ
   */
  has(key) {
    if (!this.data.has(key)) {
      return false;
    }
    
    const metadata = this.metadata.get(key);
    if (metadata.expiresAt && Date.now() > metadata.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Удалить данные из memory bank
   * @param {string} key - Ключ
   * @returns {boolean} - Успешность операции
   */
  delete(key) {
    try {
      if (!this.data.has(key)) {
        return false;
      }
      
      this.data.delete(key);
      this.metadata.delete(key);
      
      this.stats.deletes++;
      this.stats.totalOperations++;
      
      this.emit('delete', { key, size: this.data.size });
      
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }
  
  /**
   * Очистить весь memory bank
   */
  clear() {
    const count = this.data.size;
    
    this.data.clear();
    this.metadata.clear();
    
    this.emit('clear', { count });
    
    return count;
  }
  
  /**
   * Получить все ключи
   * @returns {Array} - Массив ключей
   */
  keys() {
    this._cleanupExpired();
    return Array.from(this.data.keys());
  }
  
  /**
   * Получить все значения
   * @returns {Array} - Массив значений
   */
  values() {
    this._cleanupExpired();
    return Array.from(this.data.values());
  }
  
  /**
   * Получить все записи в виде массива
   * @returns {Array} - Массив записей {key, value, metadata}
   */
  entries() {
    this._cleanupExpired();
    const result = [];
    
    for (const [key, value] of this.data.entries()) {
      if (this.metadata.has(key)) {
        result.push({
          key,
          value,
          metadata: this.metadata.get(key)
        });
      }
    }
    
    return result;
  }
  
  /**
   * Получить статистику использования
   * @returns {Object} - Статистика
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const metadata of this.metadata.values()) {
      if (metadata.expiresAt && now > metadata.expiresAt) {
        expiredCount++;
      }
    }
    
    return {
      ...this.stats,
      size: this.data.size,
      maxSize: this.options.maxSize,
      expiredCount,
      hitRate: this.stats.totalOperations > 0 ? 
        (this.stats.hits / this.stats.totalOperations) * 100 : 0
    };
  }
  
  /**
   * Получить информацию о конкретной записи
   * @param {string} key - Ключ
   * @returns {Object|null} - Информация о записи
   */
  getInfo(key) {
    if (!this.data.has(key)) {
      return null;
    }
    
    const metadata = this.metadata.get(key);
    const value = this.data.get(key);
    
    return {
      key,
      value,
      metadata: {
        ...metadata,
        isExpired: metadata.expiresAt ? Date.now() > metadata.expiresAt : false
      }
    };
  }
  
  /**
   * Установить TTL для существующей записи
   * @param {string} key - Ключ
   * @param {number} ttl - Время жизни в миллисекундах
   * @returns {boolean} - Успешность операции
   */
  setTTL(key, ttl) {
    if (!this.metadata.has(key)) {
      return false;
    }
    
    const metadata = this.metadata.get(key);
    metadata.ttl = ttl;
    metadata.expiresAt = ttl > 0 ? Date.now() + ttl : null;
    
    this.metadata.set(key, metadata);
    this.emit('ttlUpdated', { key, ttl });
    
    return true;
  }
  
  /**
   * Получить оставшееся время жизни записи
   * @param {string} key - Ключ
   * @returns {number|null} - Оставшееся время в миллисекундах или null
   */
  getTTL(key) {
    if (!this.metadata.has(key)) {
      return null;
    }
    
    const metadata = this.metadata.get(key);
    
    if (!metadata.expiresAt) {
      return null;
    }
    
    const remaining = metadata.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }
  
  /**
   * Закрыть memory bank и остановить фоновые процессы
   */
  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.emit('closed', this.getStats());
  }
  
  /**
   * Принудительная очистка устаревших записей
   */
  _cleanupExpired() {
    if (this.options.ttl <= 0) {
      return;
    }
    
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.expiresAt && now > metadata.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
      this.stats.evictions++;
    }
    
    if (expiredKeys.length > 0) {
      this.emit('cleanup', { expiredCount: expiredKeys.length });
    }
  }
  
  /**
   * Удаление самой старой записи (FIFO)
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.createdAt < oldestTime) {
        oldestTime = metadata.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
      this.emit('eviction', { key: oldestKey, reason: 'size_limit' });
    }
  }
  
  /**
   * Запуск таймера фоновой очистки
   */
  _startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this._cleanupExpired();
    }, this.options.cleanupInterval);
  }
}

module.exports = MemoryBank;
