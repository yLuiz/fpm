import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Save refresh token hash in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: this.hashToken(tokens.refresh_token) },
    });

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refresh_token } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify(refresh_token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ||
                this.configService.get<string>('JWT_SECRET') + '-refresh',
      });

      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          deletedAt: null,
        },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Token inválido');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Rotate refresh token atomically: only succeeds if the presented token is the
      // current one, so an already-used (or concurrently used) token is rejected
      const rotated = await this.prisma.user.updateMany({
        where: { id: user.id, refreshToken: this.hashToken(refresh_token) },
        data: { refreshToken: this.hashToken(tokens.refresh_token) },
      });

      if (rotated.count === 0) {
        throw new UnauthorizedException('Token inválido');
      }

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
      entity: 'User',
      entityId: userId,
    });

    return { message: 'Logout realizado com sucesso' };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return user;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m', // Access token expires in 15 minutes
      }),
      // jti makes every refresh token unique, even two issued in the same second
      this.jwtService.signAsync({ ...payload, jti: randomUUID() }, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ||
                this.configService.get<string>('JWT_SECRET') + '-refresh',
        expiresIn: '7d', // Refresh token expires in 7 days
      }),
    ]);

    return {
      access_token,
      refresh_token,
      expires_in: 900, // 15 minutes in seconds
    };
  }

  /**
   * SHA-256 of the whole token. bcrypt only reads the first 72 bytes, and JWTs of the
   * same user share that prefix, so any old refresh token would match the stored hash.
   */
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
