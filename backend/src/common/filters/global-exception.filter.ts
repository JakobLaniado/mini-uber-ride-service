import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '../exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: string[] | undefined = undefined;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'object' && 'message' in exResponse) {
        const messages = (exResponse as Record<string, unknown>).message;
        if (Array.isArray(messages)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = messages;
        } else {
          code = 'HTTP_ERROR';
          message = typeof messages === 'string' ? messages : String(messages);
        }
      } else if (typeof exResponse === 'string') {
        code = 'HTTP_ERROR';
        message = exResponse;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      success: false,
      data: null,
      error: { code, message, ...(details && { details }) },
      meta: { timestamp: new Date().toISOString() },
    });
  }
}
