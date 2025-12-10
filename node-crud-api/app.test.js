const request = require('supertest');
const express = require('express');
const cors = require('cors');
const path = require('path');
const router = require('./routes');

// Создаем тестовое приложение
const createApp = () => {
  const app = express();
  
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
      }
    });
  });
  
  return app;
};

describe('CRUD API Tests', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /', () => {
    it('должен возвращать информацию о API', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Node.js CRUD API с SQLite');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('GET /products');
    });
  });

  describe('GET /products', () => {
    it('должен возвращать список всех товаров', async () => {
      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Проверяем что есть тестовые данные
      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('quantity');
      }
    });
  });

  describe('POST /products', () => {
    it('должен создавать новый товар', async () => {
      const newProduct = {
        name: 'Клавиатура',
        description: 'Механическая клавиатура',
        price: 149.99,
        quantity: 12
      };

      const response = await request(app)
        .post('/products')
        .send(newProduct)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Товар успешно создан');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(newProduct.name);
      expect(response.body.data.price).toBe(newProduct.price);
    });

    it('должен возвращать ошибку при отсутствии обязательных полей', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          description: 'Тестовый товар'
          // Нет name и price
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Имя и цена обязательны');
    });
  });

  describe('GET /products/:id', () => {
    let createdProductId;

    beforeAll(async () => {
      // Создаем товар для тестирования
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Тестовый товар',
          description: 'Для тестирования',
          price: 99.99,
          quantity: 1
        });
      createdProductId = response.body.data.id;
    });

    it('должен возвращать товар по ID', async () => {
      const response = await request(app)
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(createdProductId);
      expect(response.body.data.name).toBe('Тестовый товар');
    });

    it('должен возвращать 404 при несуществующем ID', async () => {
      const response = await request(app)
        .get('/products/99999')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });
  });

  describe('PUT /products/:id', () => {
    let createdProductId;

    beforeAll(async () => {
      // Создаем товар для тестирования
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Товар для обновления',
          description: 'Будет обновлен',
          price: 199.99,
          quantity: 2
        });
      createdProductId = response.body.data.id;
    });

    it('должен обновлять товар', async () => {
      const updateData = {
        name: 'Обновленный товар',
        description: 'Обновленное описание',
        price: 299.99,
        quantity: 5
      };

      const response = await request(app)
        .put(`/products/${createdProductId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Товар успешно обновлен');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);
    });

    it('должен частично обновлять товар', async () => {
      const partialUpdate = {
        price: 399.99
      };

      const response = await request(app)
        .put(`/products/${createdProductId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.data.price).toBe(partialUpdate.price);
      // Проверяем что другие поля не изменились
      expect(response.body.data.name).toBe('Обновленный товар');
    });

    it('должен возвращать 404 при попытке обновить несуществующий товар', async () => {
      const response = await request(app)
        .put('/products/99999')
        .send({
          name: 'Новый товар',
          price: 100
        })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });
  });

  describe('DELETE /products/:id', () => {
    let createdProductId;

    beforeAll(async () => {
      // Создаем товар для тестирования
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Товар для удаления',
          description: 'Будет удален',
          price: 50.00,
          quantity: 1
        });
      createdProductId = response.body.data.id;
    });

    it('должен удалять товар', async () => {
      const response = await request(app)
        .delete(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Товар успешно удален');
      expect(response.body.id).toBe(String(createdProductId));
    });

    it('должен возвращать 404 при попытке удалить несуществующий товар', async () => {
      const response = await request(app)
        .delete('/products/99999')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });
  });

  describe('Ошибки сервера', () => {
    it('должен возвращать 404 при некорректном ID', async () => {
      // Тестируем с некорректным ID (не числовым)
      const response = await request(app)
        .get('/products/abc')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });
  });
});
