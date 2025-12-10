const express = require('express');
const router = express.Router();
const db = require('./db');

// GET /products - Получить все товары
router.get('/products', (req, res) => {
  const sql = 'SELECT * FROM products ORDER BY created_at DESC';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'success',
      data: rows
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
    res.json({
      message: 'success',
      data: row
    });
  });
});

// POST /products - Создать новый товар
router.post('/products', (req, res) => {
  const { name, description, price, quantity } = req.body;
  
  // Валидация обязательных полей
  if (!name || !price) {
    return res.status(400).json({ 
      error: 'Имя и цена обязательны для заполнения' 
    });
  }
  
  const sql = `INSERT INTO products (name, description, price, quantity) 
               VALUES (?, ?, ?, ?)`;
  
  db.run(sql, [name, description || '', price, quantity || 0], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Товар успешно создан',
      data: {
        id: this.lastID,
        name,
        description,
        price,
        quantity
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
    
    // Обновляем товар
    const sql = `UPDATE products SET 
                 name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 price = COALESCE(?, price),
                 quantity = COALESCE(?, quantity)
                 WHERE id = ?`;
    
    db.run(sql, [name, description, price, quantity, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Товар успешно обновлен',
        data: {
          id,
          name: name || row.name,
          description: description || row.description,
          price: price || row.price,
          quantity: quantity || row.quantity
        }
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
