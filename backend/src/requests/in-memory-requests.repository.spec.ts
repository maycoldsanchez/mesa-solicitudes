
import { describe, expect, it } from 'vitest';
import { RequestStatus } from './domain/request.types.js';
import { InMemoryRequestsRepository } from './in-memory-requests.repository.js';

describe('InMemoryRequestsRepository', () => {
  const repository = new InMemoryRequestsRepository();

  it('solo devuelve solicitudes de la sucursal solicitada', async () => {
    const result = await repository.findAll('BR-002', {
      page: 1,
      limit: 10,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((request) => request.branchId === 'BR-002'),
    ).toBe(true);
  });

  it('no encuentra una solicitud perteneciente a otra sucursal', async () => {
    const branchOneRequests = await repository.findAll('BR-001', {
      page: 1,
      limit: 1,
    });

    const requestId = branchOneRequests.items[0].id;

    await expect(
      repository.findById('BR-002', requestId),
    ).resolves.toBeNull();
  });

  it('filtra las solicitudes por estado', async () => {
    const result = await repository.findAll('BR-001', {
      status: RequestStatus.CLOSED,
      page: 1,
      limit: 20,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every(
        (request) =>
          request.branchId === 'BR-001' &&
          request.status === RequestStatus.CLOSED,
      ),
    ).toBe(true);
  });

  it('busca solicitudes por texto', async () => {
    const result = await repository.findAll('BR-001', {
      search: 'REQ-000001',
      page: 1,
      limit: 10,
    });

    expect(result.items.some((request) => request.id === 'REQ-000001')).toBe(
      true,
    );
  });

  it('pagina los resultados e informa el total', async () => {
    const firstPage = await repository.findAll('BR-001', {
      page: 1,
      limit: 10,
    });

    const secondPage = await repository.findAll('BR-001', {
      page: 2,
      limit: 10,
    });

    expect(firstPage.total).toBe(50000);
    expect(firstPage.totalPages).toBe(5000);
    expect(firstPage.items).toHaveLength(10);
    expect(secondPage.items).toHaveLength(10);
    expect(firstPage.items.map((request) => request.id)).not.toEqual(
      secondPage.items.map((request) => request.id),
    );
  });
});
