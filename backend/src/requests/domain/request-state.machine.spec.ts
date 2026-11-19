
import { describe, expect, it } from 'vitest';
import {
  InvalidRequestTransitionError,
  transitionRequest,
} from './request-state.machine.js';
import {
  RequestRole,
  RequestStatus,
} from './request.types.js';

describe('transitionRequest', () => {
  describe('transiciones permitidas', () => {
    it('permite al analista avanzar de NEW a IN_ATTENTION', () => {
      expect(
        transitionRequest(RequestStatus.NEW, {
          action: 'ADVANCE',
          actorRole: RequestRole.ANALYST,
        }),
      ).toBe(RequestStatus.IN_ATTENTION);
    });

    it('permite al analista avanzar de IN_ATTENTION a PENDING_CONFIRMATION', () => {
      expect(
        transitionRequest(RequestStatus.IN_ATTENTION, {
          action: 'ADVANCE',
          actorRole: RequestRole.ANALYST,
        }),
      ).toBe(RequestStatus.PENDING_CONFIRMATION);
    });

    it('permite a la sucursal confirmar la resolución', () => {
      expect(
        transitionRequest(RequestStatus.PENDING_CONFIRMATION, {
          action: 'CONFIRM_RESOLUTION',
          actorRole: RequestRole.BRANCH,
        }),
      ).toBe(RequestStatus.CLOSED);
    });

    it('permite a la sucursal rechazar la resolución y devolverla a atención', () => {
      expect(
        transitionRequest(RequestStatus.PENDING_CONFIRMATION, {
          action: 'REJECT_RESOLUTION',
          actorRole: RequestRole.BRANCH,
        }),
      ).toBe(RequestStatus.IN_ATTENTION);
    });
  });

  describe('transiciones rechazadas', () => {
    it('rechaza que la sucursal avance una solicitud como analista', () => {
      expect(() =>
        transitionRequest(RequestStatus.NEW, {
          action: 'ADVANCE',
          actorRole: RequestRole.BRANCH,
        }),
      ).toThrow(InvalidRequestTransitionError);
    });

    it('rechaza que el analista cierre una solicitud', () => {
      expect(() =>
        transitionRequest(RequestStatus.PENDING_CONFIRMATION, {
          action: 'CONFIRM_RESOLUTION',
          actorRole: RequestRole.ANALYST,
        }),
      ).toThrow(InvalidRequestTransitionError);
    });

    it('rechaza saltarse etapas del flujo', () => {
      expect(() =>
        transitionRequest(RequestStatus.NEW, {
          action: 'CONFIRM_RESOLUTION',
          actorRole: RequestRole.BRANCH,
        }),
      ).toThrow(InvalidRequestTransitionError);
    });

    it('rechaza modificar una solicitud cerrada', () => {
      expect(() =>
        transitionRequest(RequestStatus.CLOSED, {
          action: 'ADVANCE',
          actorRole: RequestRole.ANALYST,
        }),
      ).toThrow(InvalidRequestTransitionError);
    });
  });
});
