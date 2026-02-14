import { RideStatus } from '../enums';

export const VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  [RideStatus.REQUESTED]: [RideStatus.MATCHED, RideStatus.CANCELLED],
  [RideStatus.MATCHED]: [RideStatus.DRIVER_ARRIVING, RideStatus.CANCELLED],
  [RideStatus.DRIVER_ARRIVING]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
  [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
  [RideStatus.COMPLETED]: [],
  [RideStatus.CANCELLED]: [],
};

export class RideStateMachine {
  static canTransition(from: RideStatus, to: RideStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertTransition(from: RideStatus, to: RideStatus): void {
    if (!this.canTransition(from, to)) {
      // Import here to avoid circular dependency at module level
      const { RideStateException } =
        require('../exceptions/ride-state.exception');
      throw new RideStateException(from, to);
    }
  }

  static getAllowedTransitions(current: RideStatus): RideStatus[] {
    return VALID_TRANSITIONS[current] ?? [];
  }
}
