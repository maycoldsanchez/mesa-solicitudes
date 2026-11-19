
import {
  RequestRole,
  RequestStatus,
  TransitionCommand,
} from './request.types.js';

export class InvalidRequestTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRequestTransitionError';
  }
}

export function transitionRequest(
  currentStatus: RequestStatus,
  command: TransitionCommand,
): RequestStatus {
  const { action, actorRole } = command;

  if (currentStatus === RequestStatus.CLOSED) {
    throw new InvalidRequestTransitionError(
      'Closed requests cannot be modified.',
    );
  }

  if (action === 'ADVANCE') {
    if (actorRole !== RequestRole.ANALYST) {
      throw new InvalidRequestTransitionError(
        'Only an analyst can advance a request.',
      );
    }

    if (currentStatus === RequestStatus.NEW) {
      return RequestStatus.IN_ATTENTION;
    }

    if (currentStatus === RequestStatus.IN_ATTENTION) {
      return RequestStatus.PENDING_CONFIRMATION;
    }

    throw new InvalidRequestTransitionError(
      'The request cannot advance from its current status.',
    );
  }

  if (action === 'CONFIRM_RESOLUTION') {
    if (actorRole !== RequestRole.BRANCH) {
      throw new InvalidRequestTransitionError(
        'Only the branch can confirm the resolution.',
      );
    }

    if (currentStatus !== RequestStatus.PENDING_CONFIRMATION) {
      throw new InvalidRequestTransitionError(
        'Only requests pending confirmation can be closed.',
      );
    }

    return RequestStatus.CLOSED;
  }

  if (action === 'REJECT_RESOLUTION') {
    if (actorRole !== RequestRole.BRANCH) {
      throw new InvalidRequestTransitionError(
        'Only the branch can reject the resolution.',
      );
    }

    if (currentStatus !== RequestStatus.PENDING_CONFIRMATION) {
      throw new InvalidRequestTransitionError(
        'Only requests pending confirmation can return to attention.',
      );
    }

    return RequestStatus.IN_ATTENTION;
  }

  throw new InvalidRequestTransitionError('Unsupported request action.');
}
