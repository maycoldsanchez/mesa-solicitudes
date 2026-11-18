
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Headers,
  Body,
} from '@nestjs/common';
import { RequestsService } from './requests.service.js';
import { RequestRole, RequestStatus } from './domain/request.types.js';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  findAll(
    @Headers('x-branch-id') branchHeader: string | undefined,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const branchId = this.getBranchId(branchHeader);
    const parsedPage = this.parsePositiveInteger(page, 'page');
    const parsedLimit = this.parsePositiveInteger(limit, 'limit');

    if (parsedLimit > 100) {
      throw new BadRequestException('El límite máximo por página es 100.');
    }

    let parsedStatus: RequestStatus | undefined;

    if (status) {
      if (!Object.values(RequestStatus).includes(status as RequestStatus)) {
        throw new BadRequestException('Estado de solicitud no válido.');
      }

      parsedStatus = status as RequestStatus;
    }

    return this.requestsService.findAll(branchId, {
      status: parsedStatus,
      search,
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  @Get(':id')
  findById(
    @Headers('x-branch-id') branchHeader: string | undefined,
    @Param('id') id: string,
  ) {
    return this.requestsService.findById(this.getBranchId(branchHeader), id);
  }

  @Patch(':id/transition')
  transition(
    @Headers('x-branch-id') branchHeader: string | undefined,
    @Headers('x-user-role') roleHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: { action?: string },
  ) {
    const branchId = this.getBranchId(branchHeader);
    const actorRole = this.getActorRole(roleHeader);

    if (
      !body ||
      !['ADVANCE', 'CONFIRM_RESOLUTION', 'REJECT_RESOLUTION'].includes(
        body.action ?? '',
      )
    ) {
      throw new BadRequestException('La acción de transición no es válida.');
    }

    return this.requestsService.transition(
      branchId,
      id,
      body.action as 'ADVANCE' | 'CONFIRM_RESOLUTION' | 'REJECT_RESOLUTION',
      actorRole,
    );
  }

  private getBranchId(value: string | undefined): string {
    if (!value?.trim()) {
      throw new BadRequestException('Falta la cabecera x-branch-id.');
    }

    return value.trim();
  }

  private getActorRole(value: string | undefined): RequestRole {
    if (!value || !Object.values(RequestRole).includes(value as RequestRole)) {
      throw new BadRequestException('El rol de usuario no es válido.');
    }

    return value as RequestRole;
  }

  private parsePositiveInteger(value: string, field: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(
        `El parámetro ${field} debe ser un entero positivo.`,
      );
    }

    return parsed;
  }
}
