
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  PaginatedRequests,
  RequestFilters,
  RequestsRepository,
} from './requests.repository.js';
import {
  RequestRole,
  RequestStatus,
  type ServiceRequest,
} from './domain/request.types.js';
import {
  InvalidRequestTransitionError,
  transitionRequest,
} from './domain/request-state.machine.js';



export const REQUESTS_REPOSITORY = Symbol('REQUESTS_REPOSITORY');

@Injectable()
export class RequestsService {
  constructor(
    @Inject(REQUESTS_REPOSITORY)
    private readonly repository: RequestsRepository,
  ) {}

  findAll(
    branchId: string,
    filters: RequestFilters,
  ): Promise<PaginatedRequests> {
    return this.repository.findAll(branchId, filters);
  }

  async findById(
    branchId: string,
    requestId: string,
  ): Promise<ServiceRequest> {
    const request = await this.repository.findById(branchId, requestId);

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    return request;
  }

  async transition(
    branchId: string,
    requestId: string,
    action: 'ADVANCE' | 'CONFIRM_RESOLUTION' | 'REJECT_RESOLUTION',
    actorRole: RequestRole,
    ): Promise<ServiceRequest> {
    const request = await this.findById(branchId, requestId);

    let nextStatus: RequestStatus;

    try {
      nextStatus = transitionRequest(request.status, {
        action,
        actorRole,
      });
    } catch (error) {
      if (error instanceof InvalidRequestTransitionError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    return this.repository.save({
      ...request,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  }
}
