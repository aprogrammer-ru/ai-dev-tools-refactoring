const express = require('express');
const router = express.Router();
const db = require('./db');

// Функция экранирования HTML-символов для защиты от XSS
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// GET /products - Получить все товары
router.get('/products', (req, res) => {
  const sql = 'SELECT * FROM products ORDER BY created_at DESC';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Экранирование данных для защиты от XSS
    const safeRows = rows.map(row => ({
      ...row,
      name: escapeHtml(String(row.name || '')),
      description: escapeHtml(String(row.description || ''))
    }));
    
    res.json({
      message: 'success',
      data: safeRows
    });
  });
});

// GET /products/:id - Получить товар по ID
router.get('/products/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM products WHERE id = ?';
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    
    // Экранирование данных для защиты от XSS
    const safeRow = {
      ...row,
      name: escapeHtml(String(row.name || '')),
      description: escapeHtml(String(row.description || ''))
    };
    
    res.json({
      message: 'success',
      data: safeRow
    });
  });
});

// POST /products - Создать новый товар
router.post('/products', (req, res) => {
  const { name, description, price, quantity } = req.body;
  
  // Валидация типов и форматов данных
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Имя должно быть непустой строкой' });
  }

  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Цена должна быть положительным числом' });
  }

  if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
    return res.status(400).json({ error: 'Количество должно быть неотрицательным числом' });
  }

  // Экранирование name и description
  const safeName = escapeHtml(name.trim());
  const safeDescription = description ? escapeHtml(String(description).substring(0, 1000)) : '';
  
  const sql = `INSERT INTO products (name, description, price, quantity) 
               VALUES (?, ?, ?, ?)`;
  
  db.run(sql, [safeName, safeDescription, price, quantity || 0], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    res.status(201).json({
      message: 'Товар успешно создан',
      data: {
        id: this.lastID,
        name: safeName,
        description: safeDescription,
        price,
        quantity: quantity || 0
      }
    });
  });
});

// PUT /products/:id - Обновить товар
router.put('/products/:id', (req, res) => {
  const id = req.params.id;
  const { name, description, price, quantity } = req.body;
  
  // Проверяем существует ли товар
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    
    // Экранирование новых значений
    const safeName = name ? escapeHtml(String(name).trim()) : null;
    const safeDescription = description ? escapeHtml(String(description).substring(0, 1000)) : null;
    
    // Обновляем товар
    const sql = `UPDATE products SET 
                 name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 price = COALESCE(?, price),
                 quantity = COALESCE(?, quantity)
                 WHERE id = ?`;
    
    db.run(sql, [safeName, safeDescription, price, quantity, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Формируем безопасный ответ
      const responseData = {
        id,
        name: safeName || row.name,
        description: safeDescription || row.description,
        price: price || row.price,
        quantity: quantity || row.quantity
      };
      
      res.json({
        message: 'Товар успешно обновлен',
        data: responseData
      });
    });
  });
});

// DELETE /products/:id - Удалить товар
router.delete('/products/:id', (req, res) => {
  const id = req.params.id;
  
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    
    const sql = 'DELETE FROM products WHERE id = ?';
    
    db.run(sql, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Товар успешно удален',
        id: id
      });
    });
  });
});

module.exports = router;
