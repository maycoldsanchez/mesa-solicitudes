
import { Injectable } from '@nestjs/common';
import { RequestStatus } from './domain/request.types.js';
import type { ServiceRequest } from './domain/request.types.js';
import type {
  PaginatedRequests,
  RequestFilters,
  RequestsRepository,
} from './requests.repository.js';

@Injectable()
export class InMemoryRequestsRepository implements RequestsRepository {
  private readonly requests = new Map<string, ServiceRequest>();

  constructor() {
    this.seedRequests();
  }

  private seedRequests(): void {
    const now = Date.now();
    let sequence = 1;

    // La sucursal principal debe tener 50.000 solicitudes.
    const branchSizes = [
      { branchId: 'BR-001', count: 50_000 },
      { branchId: 'BR-002', count: 100 },
      { branchId: 'BR-003', count: 100 },
      { branchId: 'BR-004', count: 100 },
      { branchId: 'BR-005', count: 100 },
      { branchId: 'BR-006', count: 100 },
      { branchId: 'BR-007', count: 100 },
      { branchId: 'BR-008', count: 100 },
      { branchId: 'BR-009', count: 100 },
      { branchId: 'BR-010', count: 100 },
    ];

    const statuses = Object.values(RequestStatus);

    for (const branch of branchSizes) {
      for (let index = 0; index < branch.count; index++) {
        const id = `REQ-${String(sequence).padStart(6, '0')}`;
        const status = statuses[(sequence - 1) % statuses.length];

        const createdAt = new Date(
          now - (sequence - 1) * 60_000,
        ).toISOString();

        const request: ServiceRequest = {
          id,
          branchId: branch.branchId,
          title: `Solicitud de servicio ${id}`,
          description:
            `Solicitud de ejemplo ${sequence} correspondiente a la sucursal ${branch.branchId}.`,
          status,
          createdAt,
          updatedAt: createdAt,
        };

        this.requests.set(id, request);
        sequence++;
      }
    }
  }

  async findAll(
    branchId: string,
    filters: RequestFilters,
  ): Promise<PaginatedRequests> {
    const normalizedSearch = filters.search?.trim().toLowerCase();

    const matchingRequests = Array.from(this.requests.values())
      .filter((request) => request.branchId === branchId)
      .filter(
        (request) => !filters.status || request.status === filters.status,
      )
      .filter((request) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          request.id,
          request.title,
          request.description,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

    const total = matchingRequests.length;
    const startIndex = (filters.page - 1) * filters.limit;

    return {
      items: matchingRequests.slice(
        startIndex,
        startIndex + filters.limit,
      ),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async findById(
    branchId: string,
    requestId: string,
  ): Promise<ServiceRequest | null> {
    const request = this.requests.get(requestId);

    if (!request || request.branchId !== branchId) {
      return null;
    }

    return { ...request };
  }

  async save(request: ServiceRequest): Promise<ServiceRequest> {
    this.requests.set(request.id, { ...request });
    return { ...request };
  }
}
