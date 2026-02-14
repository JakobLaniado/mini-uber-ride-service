import { RideStateMachine } from './ride-states';
import { RideStatus } from '../enums';

describe('RideStateMachine', () => {
  describe('canTransition', () => {
    const validTransitions: [RideStatus, RideStatus][] = [
      [RideStatus.REQUESTED, RideStatus.MATCHED],
      [RideStatus.REQUESTED, RideStatus.CANCELLED],
      [RideStatus.MATCHED, RideStatus.DRIVER_ARRIVING],
      [RideStatus.MATCHED, RideStatus.CANCELLED],
      [RideStatus.DRIVER_ARRIVING, RideStatus.IN_PROGRESS],
      [RideStatus.DRIVER_ARRIVING, RideStatus.CANCELLED],
      [RideStatus.IN_PROGRESS, RideStatus.COMPLETED],
      [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
    ];

    it.each(validTransitions)(
      'should allow %s → %s',
      (from, to) => {
        expect(RideStateMachine.canTransition(from, to)).toBe(true);
      },
    );

    const invalidTransitions: [RideStatus, RideStatus][] = [
      [RideStatus.REQUESTED, RideStatus.IN_PROGRESS],
      [RideStatus.REQUESTED, RideStatus.COMPLETED],
      [RideStatus.REQUESTED, RideStatus.DRIVER_ARRIVING],
      [RideStatus.MATCHED, RideStatus.COMPLETED],
      [RideStatus.MATCHED, RideStatus.IN_PROGRESS],
      [RideStatus.DRIVER_ARRIVING, RideStatus.MATCHED],
      [RideStatus.DRIVER_ARRIVING, RideStatus.COMPLETED],
      [RideStatus.IN_PROGRESS, RideStatus.MATCHED],
      [RideStatus.COMPLETED, RideStatus.CANCELLED],
      [RideStatus.COMPLETED, RideStatus.REQUESTED],
      [RideStatus.CANCELLED, RideStatus.REQUESTED],
      [RideStatus.CANCELLED, RideStatus.MATCHED],
    ];

    it.each(invalidTransitions)(
      'should reject %s → %s',
      (from, to) => {
        expect(RideStateMachine.canTransition(from, to)).toBe(false);
      },
    );
  });

  describe('assertTransition', () => {
    it('should not throw for valid transitions', () => {
      expect(() =>
        RideStateMachine.assertTransition(
          RideStatus.REQUESTED,
          RideStatus.MATCHED,
        ),
      ).not.toThrow();
    });

    it('should throw RideStateException for invalid transitions', () => {
      expect(() =>
        RideStateMachine.assertTransition(
          RideStatus.REQUESTED,
          RideStatus.COMPLETED,
        ),
      ).toThrow();
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for REQUESTED', () => {
      expect(RideStateMachine.getAllowedTransitions(RideStatus.REQUESTED)).toEqual([
        RideStatus.MATCHED,
        RideStatus.CANCELLED,
      ]);
    });

    it('should return empty array for terminal states', () => {
      expect(RideStateMachine.getAllowedTransitions(RideStatus.COMPLETED)).toEqual([]);
      expect(RideStateMachine.getAllowedTransitions(RideStatus.CANCELLED)).toEqual([]);
    });
  });
});
