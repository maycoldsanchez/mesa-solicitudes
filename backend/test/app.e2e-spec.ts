
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('API de solicitudes (e2e)', () => {
  let app: INestApplication<App>;

  const branchId = 'BR-001';
  const otherBranchId = 'BR-002';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Endpoint raíz', () => {
    it('GET / debe responder correctamente', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('GET /requests', () => {
    it('debe listar solicitudes de la sucursal y paginar los resultados', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests?page=1&limit=10')
        .set('x-branch-id', branchId)
        .expect(200);

      expect(response.body.items).toHaveLength(10);
      expect(response.body.total).toBe(50000);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.totalPages).toBe(5000);

      expect(
        response.body.items.every(
          (item: { branchId: string }) => item.branchId === branchId,
        ),
      ).toBe(true);
    });

    it('debe rechazar una solicitud sin la cabecera de sucursal', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests')
        .expect(400);

      expect(response.body.message).toBe(
        'Falta la cabecera x-branch-id.',
      );
    });

    it('debe rechazar un estado inválido', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests?status=INVALIDO')
        .set('x-branch-id', branchId)
        .expect(400);

      expect(response.body.message).toBe(
        'Estado de solicitud no válido.',
      );
    });

    it('debe rechazar una página que no sea un entero positivo', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests?page=0')
        .set('x-branch-id', branchId)
        .expect(400);

      expect(response.body.message).toBe(
        'El parámetro page debe ser un entero positivo.',
      );
    });

    it('debe rechazar un límite superior a 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests?limit=101')
        .set('x-branch-id', branchId)
        .expect(400);

      expect(response.body.message).toBe(
        'El límite máximo por página es 100.',
      );
    });

    it('debe filtrar solicitudes por estado', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests?status=NEW&limit=10')
        .set('x-branch-id', branchId)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      expect(
        response.body.items.every(
          (item: { status: string }) => item.status === 'NEW',
        ),
      ).toBe(true);
    });
  });

  describe('Aislamiento entre sucursales', () => {
    it('no debe permitir consultar solicitudes de otra sucursal', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/requests?limit=1')
        .set('x-branch-id', branchId)
        .expect(200);

      const requestId = listResponse.body.items[0].id;

      const response = await request(app.getHttpServer())
        .get(`/requests/${requestId}`)
        .set('x-branch-id', otherBranchId)
        .expect(404);

      expect(response.body.message).toBe('Solicitud no encontrada.');
    });

    it('no debe permitir modificar solicitudes de otra sucursal', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/requests?status=NEW&limit=1')
        .set('x-branch-id', branchId)
        .expect(200);

      const requestId = listResponse.body.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/transition`)
        .set('x-branch-id', otherBranchId)
        .set('x-user-role', 'ANALYST')
        .send({ action: 'ADVANCE' })
        .expect(404);

      expect(response.body.message).toBe('Solicitud no encontrada.');
    });
  });

  describe('PATCH /requests/:id/transition', () => {
    it('debe permitir avanzar una solicitud nueva como analista', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/requests?status=NEW&limit=1')
        .set('x-branch-id', branchId)
        .expect(200);

      const requestId = listResponse.body.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/transition`)
        .set('x-branch-id', branchId)
        .set('x-user-role', 'ANALYST')
        .send({ action: 'ADVANCE' })
        .expect(200);

      expect(response.body.id).toBe(requestId);
      expect(response.body.status).toBe('IN_ATTENTION');
    });

    it('debe rechazar una transición sin rol de usuario válido', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/requests?status=NEW&limit=1')
        .set('x-branch-id', branchId)
        .expect(200);

      const requestId = listResponse.body.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/transition`)
        .set('x-branch-id', branchId)
        .send({ action: 'ADVANCE' })
        .expect(400);

      expect(response.body.message).toBe(
        'El rol de usuario no es válido.',
      );
    });

    it('debe rechazar una acción inválida', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/requests?status=NEW&limit=1')
        .set('x-branch-id', branchId)
        .expect(200);

      const requestId = listResponse.body.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/transition`)
        .set('x-branch-id', branchId)
        .set('x-user-role', 'ANALYST')
        .send({ action: 'ELIMINAR' })
        .expect(400);

      expect(response.body.message).toBe(
        'La acción de transición no es válida.',
      );
    });

    it('debe rechazar avanzar una solicitud cerrada y conservar su estado', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/requests?status=CLOSED&limit=1')
        .set('x-branch-id', branchId)
        .expect(200);

      const requestId = listResponse.body.items[0].id;

      const transitionResponse = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/transition`)
        .set('x-branch-id', branchId)
        .set('x-user-role', 'ANALYST')
        .send({ action: 'ADVANCE' })
        .expect(400);

      expect(transitionResponse.body.message).toBe(
        'Closed requests cannot be modified.',
      );

      const getResponse = await request(app.getHttpServer())
        .get(`/requests/${requestId}`)
        .set('x-branch-id', branchId)
        .expect(200);

      expect(getResponse.body.status).toBe('CLOSED');
    });
  });
});
