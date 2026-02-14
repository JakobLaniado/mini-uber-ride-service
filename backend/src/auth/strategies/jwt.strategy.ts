import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../common/interfaces/authenticated-request.interface';
import { Role } from '../../common/enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // In production, replace secretOrKey with:
      //   secretOrKeyProvider: passportJwtSecret({ jwksUri: `${issuer}.well-known/jwks.json` })
      secretOrKey: config.get<string>('JWT_SECRET')!,
      issuer: config.get<string>('AUTH_ISSUER'),
      audience: config.get<string>('AUTH_AUDIENCE'),
    });
  }

  validate(payload: { sub: string; email: string; role: Role }): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
