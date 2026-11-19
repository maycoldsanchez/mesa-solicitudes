
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PaginatedRequests,
  RequestAction,
  RequestRole,
  RequestStatus,
  ServiceRequest,
} from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class RequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/requests';

  list(
    branchId: string,
    page: number,
    limit: number,
    status?: RequestStatus,
    search?: string,
  ): Observable<PaginatedRequests> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    if (status) params = params.set('status', status);
    if (search?.trim()) params = params.set('search', search.trim());

    return this.http.get<PaginatedRequests>(this.baseUrl, {
      headers: this.headers(branchId),
      params,
    });
  }

  getById(branchId: string, id: string): Observable<ServiceRequest> {
    return this.http.get<ServiceRequest>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
      { headers: this.headers(branchId) },
    );
  }

  transition(
    branchId: string,
    role: RequestRole,
    id: string,
    action: RequestAction,
  ): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(
      `${this.baseUrl}/${encodeURIComponent(id)}/transition`,
      { action },
      { headers: this.headers(branchId, role) },
    );
  }

  private headers(branchId: string, role?: RequestRole): HttpHeaders {
    let headers = new HttpHeaders({ 'x-branch-id': branchId });

    if (role) headers = headers.set('x-user-role', role);

    return headers;
  }
}
