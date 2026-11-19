
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  RequestRole,
  RequestStatus,
  type ServiceRequest,
} from './domain/request.types.js';
import type { RequestsRepository } from './requests.repository.js';
import { RequestsService } from './requests.service.js';

function createRequest(
  overrides: Partial<ServiceRequest> = {},
): ServiceRequest {
  return {
    id: 'REQ-000001',
    branchId: 'BR-001',
    title: 'Solicitud de prueba',
    description: 'Descripción de prueba',
    status: RequestStatus.NEW,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function createRepositoryMock() {
  return {
    findAll: vi.fn<RequestsRepository['findAll']>(),
    findById: vi.fn<RequestsRepository['findById']>(),
    save: vi.fn<RequestsRepository['save']>(),
  } satisfies RequestsRepository;
}

describe('RequestsService', () => {
  describe('findById', () => {
    it('devuelve una solicitud perteneciente a la sucursal solicitante', async () => {
      const request = createRequest();
      const repository = createRepositoryMock();
      repository.findById.mockResolvedValue(request);

      const service = new RequestsService(repository);

      await expect(
        service.findById('BR-001', 'REQ-000001'),
      ).resolves.toEqual(request);

      expect(repository.findById).toHaveBeenCalledWith(
        'BR-001',
        'REQ-000001',
      );
    });

    it('responde con el mismo error cuando la solicitud no existe o pertenece a otra sucursal', async () => {
      const repository = createRepositoryMock();
      repository.findById.mockResolvedValue(null);

      const service = new RequestsService(repository);

      await expect(
        service.findById('BR-002', 'REQ-000001'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findById('BR-002', 'REQ-INEXISTENTE'),
      ).rejects.toThrow('Solicitud no encontrada.');
    });
  });

  describe('transition', () => {
    it('permite avanzar una solicitud válida y guarda el nuevo estado', async () => {
      const request = createRequest();
      const repository = createRepositoryMock();

      repository.findById.mockResolvedValue(request);
      repository.save.mockImplementation(async (updatedRequest) => updatedRequest);

      const service = new RequestsService(repository);

      const result = await service.transition(
        'BR-001',
        'REQ-000001',
        'ADVANCE',
        RequestRole.ANALYST,
      );

      expect(result.status).toBe(RequestStatus.IN_ATTENTION);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'REQ-000001',
          branchId: 'BR-001',
          status: RequestStatus.IN_ATTENTION,
        }),
      );
    });

    it('rechaza una transición inválida y no guarda cambios', async () => {
      const request = createRequest();
      const repository = createRepositoryMock();

      repository.findById.mockResolvedValue(request);

      const service = new RequestsService(repository);

      await expect(
        service.transition(
          'BR-001',
          'REQ-000001',
          'CONFIRM_RESOLUTION',
          RequestRole.BRANCH,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repository.save).not.toHaveBeenCalled();
    });

    it('no modifica una solicitud cuando la sucursal no es propietaria', async () => {
      const repository = createRepositoryMock();
      repository.findById.mockResolvedValue(null);

      const service = new RequestsService(repository);

      await expect(
        service.transition(
          'BR-002',
          'REQ-000001',
          'ADVANCE',
          RequestRole.ANALYST,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
