
import type { ServiceRequest, RequestStatus } from './domain/request.types.js';

export interface RequestFilters {
  status?: RequestStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface PaginatedRequests {
  items: ServiceRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RequestsRepository {
  findAll(
    branchId: string,
    filters: RequestFilters,
  ): Promise<PaginatedRequests>;

  findById(
    branchId: string,
    requestId: string,
  ): Promise<ServiceRequest | null>;

  save(request: ServiceRequest): Promise<ServiceRequest>;
}
