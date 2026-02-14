import { HttpStatus } from '@nestjs/common';
import { BusinessException } from './business.exception';

export class DriverUnavailableException extends BusinessException {
  constructor() {
    super(
      'NO_DRIVERS_AVAILABLE',
      'No online drivers found within the search radius',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
