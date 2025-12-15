const request = require('supertest');
const express = require('express');
const cors = require('cors');
const path = require('path');
const router = require('./routes');
const db = require('./db');

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

describe('Интеграционные тесты CRUD API', () => {
  let app;
  let createdProductId;

  beforeAll((done) => {
    app = createApp();
    
    // Очищаем таблицу перед тестами
    db.run('DELETE FROM products', () => {
      done();
    });
  });

  afterAll((done) => {
    // Очищаем таблицу после тестов
    db.run('DELETE FROM products', () => {
      db.close();
      done();
    });
  });

  describe('POST /products - Создание товара', () => {
    it('должен создавать новый товар', async () => {
      const newProduct = {
        name: 'Ноутбук Dell XPS 13',
        description: 'Ультрабук с процессором Intel Core i7',
        price: 1299.99,
        quantity: 5
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
      expect(response.body.data.quantity).toBe(newProduct.quantity);
      
      createdProductId = response.body.data.id;
    });

    it('должен создавать товар с минимальными данными', async () => {
      const minimalProduct = {
        name: 'Мышь',
        price: 29.99
      };

      const response = await request(app)
        .post('/products')
        .send(minimalProduct)
        .expect(201);

      expect(response.body.data.name).toBe(minimalProduct.name);
      expect(response.body.data.price).toBe(minimalProduct.price);
      expect(response.body.data.quantity).toBe(0);
      expect(response.body.data.description).toBe('');
    });

    it('должен возвращать ошибку при отсутствии имени', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          price: 99.99
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Имя должно быть непустой строкой');
    });

    it('должен возвращать ошибку при отсутствии цены', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Тестовый товар'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Цена должна быть положительным числом');
    });

    it('должен возвращать ошибку при нулевой цене', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Тестовый товар',
          price: 0
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Цена должна быть положительным числом');
    });

    it('должен возвращать ошибку при отрицательной цене', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Тестовый товар',
          price: -10
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Цена должна быть положительным числом');
    });

    it('должен возвращать ошибку при отрицательном количестве', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Тестовый товар',
          price: 99.99,
          quantity: -1
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Количество должно быть неотрицательным числом');
    });

    it('должен экранировать HTML в имени товара', async () => {
      const productWithHtml = {
        name: 'Товар <script>alert("xss")</script>',
        description: 'Описание с HTML',
        price: 99.99
      };

      const response = await request(app)
        .post('/products')
        .send(productWithHtml)
        .expect(201);

      expect(response.body.data.name).not.toContain('<script>');
      expect(response.body.data.name).toContain('<script>');
    });
  });

  describe('GET /products - Получение всех товаров', () => {
    it('должен возвращать список всех товаров', async () => {
      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Проверяем структуру первого товара
      const product = response.body.data[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('quantity');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('created_at');
    });

    it('должен возвращать пустой массив если товаров нет', async () => {
      // Сначала удалим все товары
      await request(app).delete(`/products/${createdProductId}`);
      
      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /products/:id - Получение товара по ID', () => {
    beforeAll(async () => {
      // Создаем товар для тестирования
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Тестовый товар для GET',
          description: 'Описание',
          price: 199.99,
          quantity: 3
        });
      createdProductId = response.body.data.id;
    });

    it('должен возвращать товар по корректному ID', async () => {
      const response = await request(app)
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(createdProductId);
      expect(response.body.data.name).toBe('Тестовый товар для GET');
      expect(response.body.data.price).toBe(199.99);
      expect(response.body.data.quantity).toBe(3);
    });

    it('должен возвращать 404 при несуществующем ID', async () => {
      const response = await request(app)
        .get('/products/99999')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });

    it('должен возвращать 404 при некорректном ID', async () => {
      const response = await request(app)
        .get('/products/abc')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });
  });

  describe('PUT /products/:id - Обновление товара', () => {
    let testProductId;

    beforeAll(async () => {
      // Создаем товар для тестирования
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Товар для обновления',
          description: 'Старое описание',
          price: 100.00,
          quantity: 1
        });
      testProductId = response.body.data.id;
    });

    it('должен полностью обновлять товар', async () => {
      const updateData = {
        name: 'Обновленный товар',
        description: 'Новое описание',
        price: 299.99,
        quantity: 10
      };

      const response = await request(app)
        .put(`/products/${testProductId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Товар успешно обновлен');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.price).toBe(updateData.price);
      expect(response.body.data.quantity).toBe(updateData.quantity);
    });

    it('должен частично обновлять товар', async () => {
      const partialUpdate = {
        price: 399.99
      };

      const response = await request(app)
        .put(`/products/${testProductId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.data.price).toBe(partialUpdate.price);
      // Проверяем что другие поля не изменились
      expect(response.body.data.name).toBe('Обновленный товар');
      expect(response.body.data.description).toBe('Новое описание');
      expect(response.body.data.quantity).toBe(10);
    });

    it('должен обновлять только переданные поля', async () => {
      const partialUpdate = {
        name: 'Только имя изменено'
      };

      const response = await request(app)
        .put(`/products/${testProductId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.data.name).toBe(partialUpdate.name);
      expect(response.body.data.price).toBe(399.99); // Остается предыдущее значение
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

    it('должен экранировать HTML в обновляемых данных', async () => {
      const updateData = {
        name: 'Товар с <script>alert("xss")</script>',
        description: 'Описание с <b>HTML</b>'
      };

      const response = await request(app)
        .put(`/products/${testProductId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).not.toContain('<script>');
      expect(response.body.data.name).toContain('<script>');
      expect(response.body.data.description).not.toContain('<b>');
      expect(response.body.data.description).toContain('<b>');
    });
  });

  describe('DELETE /products/:id - Удаление товара', () => {
    let testProductId;

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
      testProductId = response.body.data.id;
    });

    it('должен удалять существующий товар', async () => {
      const response = await request(app)
        .delete(`/products/${testProductId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Товар успешно удален');
      expect(response.body.id).toBe(String(testProductId));
    });

    it('должен возвращать 404 при попытке удалить несуществующий товар', async () => {
      const response = await request(app)
        .delete('/products/99999')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });

    it('должен возвращать 404 при некорректном ID', async () => {
      const response = await request(app)
        .delete('/products/abc')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });

    it('должен возвращать 404 при удалении уже удаленного товара', async () => {
      const response = await request(app)
        .delete(`/products/${testProductId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Товар не найден');
    });
  });

  describe('Комплексные сценарии', () => {
    it('должен создать, получить, обновить и удалить товар', async () => {
      // 1. Создаем товар
      const createResponse = await request(app)
        .post('/products')
        .send({
          name: 'Комплексный тест',
          description: 'Тестовый товар',
          price: 250.00,
          quantity: 2
        })
        .expect(201);

      const productId = createResponse.body.data.id;

      // 2. Получаем товар
      const getResponse = await request(app)
        .get(`/products/${productId}`)
        .expect(200);

      expect(getResponse.body.data.name).toBe('Комплексный тест');

      // 3. Обновляем товар
      const updateResponse = await request(app)
        .put(`/products/${productId}`)
        .send({
          name: 'Обновленный комплексный тест',
          price: 300.00
        })
        .expect(200);

      expect(updateResponse.body.data.name).toBe('Обновленный комплексный тест');
      expect(updateResponse.body.data.price).toBe(300);

      // 4. Удаляем товар
      await request(app)
        .delete(`/products/${productId}`)
        .expect(200);

      // 5. Проверяем что товар удален
      await request(app)
        .get(`/products/${productId}`)
        .expect(404);
    });

    it('должен обрабатывать большое количество товаров', async () => {
      // Создаем 10 товаров
      const createPromises = [];
      for (let i = 1; i <= 10; i++) {
        createPromises.push(
          request(app)
            .post('/products')
            .send({
              name: `Товар ${i}`,
              description: `Описание товара ${i}`,
              price: 100 + i,
              quantity: i
            })
        );
      }

      const createResponses = await Promise.all(createPromises);
      createResponses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Получаем все товары
      const getAllResponse = await request(app)
        .get('/products')
        .expect(200);

      expect(getAllResponse.body.data.length).toBe(10);

      // Удаляем все созданные товары
      for (const response of createResponses) {
        await request(app)
          .delete(`/products/${response.body.data.id}`)
          .expect(200);
      }

      // Проверяем что все удалены
      const finalGetResponse = await request(app)
        .get('/products')
        .expect(200);

      expect(finalGetResponse.body.data.length).toBe(0);
    });
  });
});
