
export type RequestStatus =
  | 'NEW'
  | 'IN_ATTENTION'
  | 'PENDING_CONFIRMATION'
  | 'CLOSED';

export type RequestRole = 'ANALYST' | 'BRANCH';

export type RequestAction =
  | 'ADVANCE'
  | 'CONFIRM_RESOLUTION'
  | 'REJECT_RESOLUTION';

export interface ServiceRequest {
  id: string;
  branchId: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRequests {
  items: ServiceRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
