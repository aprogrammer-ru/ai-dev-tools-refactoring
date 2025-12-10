const express = require('express');
const cors = require('cors');
const path = require('path');
const router = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключаем маршруты
app.use('/', router);

// Главная страница
app.get('/', (req, res) => {
  res.json({
    message: 'Node.js CRUD API с SQLite',
    endpoints: {
      'GET /': 'Этот список',
      'GET /products': 'Получить все товары',
      'GET /products/:id': 'Получить товар по ID',
      'POST /products': 'Создать новый товар',
      'PUT /products/:id': 'Обновить товар',
      'DELETE /products/:id': 'Удалить товар'
    },
    example: {
      'POST /products': {
        body: {
          name: 'Ноутбук',
          description: 'Мощный игровой ноутбук',
          price: 999.99,
          quantity: 10
        }
      }
    }
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
