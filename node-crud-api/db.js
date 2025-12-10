const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем базу данных в папке приложения
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Создаем таблицу products при запуске
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    quantity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы:', err.message);
    } else {
      console.log('Таблица products создана или уже существует');
      
      // Проверяем есть ли данные в таблице
      db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (err) {
          console.error('Ошибка проверки данных:', err.message);
        } else if (row.count === 0) {
          // Заполняем тестовыми данными
          insertTestData();
        } else {
          console.log(`В таблице уже есть ${row.count} записей`);
        }
      });
    }
  });
});

// Функция для вставки тестовых данных
function insertTestData() {
  const testData = [
    ['Ноутбук', 'Мощный игровой ноутбук', 1299.99, 5],
    ['Телефон', 'Смартфон с большим экраном', 699.99, 10],
    ['Планшет', '10-дюймовый планшет', 399.99, 8],
    ['Наушники', 'Беспроводные наушники', 199.99, 15],
    ['Мышь', 'Игровая оптическая мышь', 49.99, 20]
  ];

  const sql = `INSERT INTO products (name, description, price, quantity) 
               VALUES (?, ?, ?, ?)`;

  db.serialize(() => {
    const stmt = db.prepare(sql);
    testData.forEach(product => {
      stmt.run(product, function(err) {
        if (err) {
          console.error('Ошибка вставки тестовых данных:', err.message);
        } else {
          console.log(`Тестовый товар добавлен: ${product[0]} (ID: ${this.lastID})`);
        }
      });
    });
    stmt.finalize(() => {
      console.log('Тестовые данные загружены');
    });
  });
}

// Экспортируем функцию для использования в тестах
module.exports = db;
module.exports.insertTestData = insertTestData;
