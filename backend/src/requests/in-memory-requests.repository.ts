
import { Injectable } from '@nestjs/common';
import type {
  PaginatedRequests,
  RequestFilters,
  RequestsRepository,
} from './requests.repository.js';
import {
  RequestStatus,
  type ServiceRequest,
} from './domain/request.types.js';

const DEFAULT_TOTAL_REQUESTS = 50_000;
const DEFAULT_BRANCHES = 10;

@Injectable()
export class InMemoryRequestsRepository implements RequestsRepository {
  private readonly requests = new Map<string, ServiceRequest>();

  constructor() {
    this.seed();
  }

  async findAll(
    branchId: string,
    filters: RequestFilters,
  ): Promise<PaginatedRequests> {
    const search = filters.search?.trim().toLocaleLowerCase();

    const matchingRequests: ServiceRequest[] = [];

    for (const request of this.requests.values()) {
      if (request.branchId !== branchId) {
        continue;
      }

      if (filters.status && request.status !== filters.status) {
        continue;
      }

      if (
        search &&
        !request.id.toLocaleLowerCase().includes(search) &&
        !request.title.toLocaleLowerCase().includes(search) &&
        !request.description.toLocaleLowerCase().includes(search)
      ) {
        continue;
      }

      matchingRequests.push(request);
    }

    matchingRequests.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    const total = matchingRequests.length;
    const offset = (filters.page - 1) * filters.limit;

    return {
      items: matchingRequests.slice(offset, offset + filters.limit),
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
    const savedRequest = { ...request };
    this.requests.set(savedRequest.id, savedRequest);
    return { ...savedRequest };
  }

  private seed(): void {
    const statuses = Object.values(RequestStatus);
    const now = Date.now();

    for (let index = 1; index <= DEFAULT_TOTAL_REQUESTS; index++) {
      const branchNumber =
        ((index - 1) % DEFAULT_BRANCHES) + 1;
      const status = statuses[(index - 1) % statuses.length];

      const createdAt = new Date(
        now - index * 60_000,
      ).toISOString();

      const request: ServiceRequest = {
        id: `REQ-${String(index).padStart(6, '0')}`,
        branchId: `BR-${String(branchNumber).padStart(3, '0')}`,
        title: `Solicitud de servicio ${index}`,
        description: `Descripción de prueba para la solicitud ${index}`,
        status,
        createdAt,
        updatedAt: createdAt,
      };

      this.requests.set(request.id, request);
    }
  }
}
