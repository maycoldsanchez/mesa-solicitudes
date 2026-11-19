
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { RequestsApiService } from './services/requests-api.service';
import {
  RequestAction,
  RequestRole,
  RequestStatus,
  ServiceRequest,
} from './models/request.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly requestsApi = inject(RequestsApiService);

  requests: ServiceRequest[] = [];
  selectedRequest: ServiceRequest | null = null;

  branchId = 'BR-001';
  role: RequestRole = 'ANALYST';

  searchTerm = '';
  statusFilter: RequestStatus | '' = '';

  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;

  loading = false;
  errorMessage = '';
  successMessage = '';

  readonly statuses: { value: RequestStatus; label: string }[] = [
    { value: 'NEW', label: 'Nueva' },
    { value: 'IN_ATTENTION', label: 'En atención' },
    { value: 'PENDING_CONFIRMATION', label: 'Pendiente de confirmación' },
    { value: 'CLOSED', label: 'Cerrada' },
  ];

  loadRequests(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.requestsApi
      .list(
        this.branchId,
        this.page,
        this.limit,
        this.statusFilter || undefined,
        this.searchTerm,
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.requests = response.items;
          this.total = response.total;
          this.page = response.page;
          this.totalPages = response.totalPages;

          if (
            this.selectedRequest &&
            !this.requests.some(
              (request) => request.id === this.selectedRequest?.id,
            )
          ) {
            this.selectedRequest = null;
          }
        },
        error: (error) => {
          this.requests = [];
          this.total = 0;
          this.totalPages = 0;
          this.errorMessage =
            error.error?.message ||
            'No fue posible cargar las solicitudes. Verifica que la API esté disponible.';
        },
      });
  }

  search(): void {
    this.page = 1;
    this.loadRequests();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.page = 1;
    this.loadRequests();
  }

  changeContext(): void {
    this.selectedRequest = null;
    this.page = 1;
    this.loadRequests();
  }

  changePage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages || this.loading) {
      return;
    }

    this.page = newPage;
    this.loadRequests();
  }

  openDetails(request: ServiceRequest): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.requestsApi.getById(this.branchId, request.id).subscribe({
      next: (result) => {
        this.selectedRequest = result;
      },
      error: (error) => {
        this.selectedRequest = null;
        this.errorMessage =
          error.error?.message || 'No fue posible consultar la solicitud.';
      },
    });
  }

  performAction(action: RequestAction): void {
    if (!this.selectedRequest) {
      return;
    }

    const requestId = this.selectedRequest.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.requestsApi
      .transition(this.branchId, this.role, requestId, action)
      .subscribe({
        next: (updatedRequest) => {
          this.selectedRequest = updatedRequest;
          this.successMessage = this.getActionSuccessMessage(action);
          this.loadRequests();
        },
        error: (error) => {
          this.errorMessage =
            error.error?.message ||
            'No fue posible actualizar el estado de la solicitud.';
        },
      });
  }

  getStatusLabel(status: RequestStatus): string {
    return (
      this.statuses.find((item) => item.value === status)?.label ?? status
    );
  }

  getStatusClass(status: RequestStatus): string {
    return status.toLowerCase().replaceAll('_', '-');
  }

  getActionSuccessMessage(action: RequestAction): string {
    const messages: Record<RequestAction, string> = {
      ADVANCE: 'La solicitud avanzó a la siguiente etapa.',
      CONFIRM_RESOLUTION: 'La resolución fue confirmada y la solicitud se cerró.',
      REJECT_RESOLUTION:
        'La resolución fue devuelta a atención para su revisión.',
    };

    return messages[action];
  }
}
