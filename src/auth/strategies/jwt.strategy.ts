import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || '',
    });
  }
  async validate(payload: any) {
    return {
      userId: payload.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      idCard: payload.idCard,
      email: payload.email,
      role: payload.role,
      userType: payload.userType,
    };
  }
}
