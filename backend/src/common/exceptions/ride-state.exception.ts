import { RideStatus } from '../enums';
import { BusinessException } from './business.exception';

export class RideStateException extends BusinessException {
  constructor(from: RideStatus, to: RideStatus) {
    super(
      'INVALID_STATE_TRANSITION',
      `Cannot transition ride from '${from}' to '${to}'`,
    );
  }
}
