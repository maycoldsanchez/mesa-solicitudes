
import { Module } from '@nestjs/common';
import { InMemoryRequestsRepository } from './in-memory-requests.repository.js';
import { REQUESTS_REPOSITORY, RequestsService } from './requests.service.js';
import { RequestsController } from './requests.controller.js';

@Module({
  controllers: [RequestsController],
  providers: [
    RequestsService,
    InMemoryRequestsRepository,
    {
      provide: REQUESTS_REPOSITORY,
      useExisting: InMemoryRequestsRepository,
    },
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
