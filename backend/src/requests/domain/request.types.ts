
export enum RequestStatus {
  NEW = 'NEW',
  IN_ATTENTION = 'IN_ATTENTION',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CLOSED = 'CLOSED',
}

export enum RequestRole {
  ANALYST = 'ANALYST',
  BRANCH = 'BRANCH',
}

export interface ServiceRequest {
  id: string;
  branchId: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type RequestAction =
  | 'ADVANCE'
  | 'CONFIRM_RESOLUTION'
  | 'REJECT_RESOLUTION';

export interface TransitionCommand {
  action: RequestAction;
  actorRole: RequestRole;
}
