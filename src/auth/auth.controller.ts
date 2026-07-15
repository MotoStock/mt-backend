import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Public } from './public.decorator';

@Controller('api/auth')
export class AuthController {
  @Public()
  @Post('login')
  login(@Body() body: { password: string }) {
    const appPassword = process.env.APP_PASSWORD;
    if (!appPassword) {
      throw new UnauthorizedException(
        'APP_PASSWORD no está configurado en el servidor.',
      );
    }

    if (body.password !== appPassword) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Generate a simple HMAC token
    const secret = process.env.APP_SECRET || 'motostock-default-secret';
    const token = createHmac('sha256', secret)
      .update('motostock-auth')
      .digest('hex');

    return { token };
  }
}
