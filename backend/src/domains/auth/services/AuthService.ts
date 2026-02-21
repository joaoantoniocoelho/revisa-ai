import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import type { IUserDoc } from '../models/User.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { CreditsService } from '../../credits/services/CreditsService.js';
import { generateToken } from '../../../shared/config/jwt.js';
import { toUserResponse } from '../utils/user.js';
import { EmailService } from './EmailService.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const DEFAULT_BACKEND_URL = `http://localhost:${process.env.PORT ?? 3001}`;

function getBackendBaseUrl(): string {
  const raw = (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.origin;
  } catch {
    console.warn('[AuthService] Invalid BACKEND_URL, falling back to localhost');
    return DEFAULT_BACKEND_URL;
  }
}

export interface AuthServiceResult {
  user?: Record<string, unknown> & { credits?: number };
  token?: string;
}

export class AuthService {
  private readonly userRepository = new UserRepository();
  private readonly creditsService = new CreditsService();
  private readonly emailService = new EmailService();
  private readonly backendBaseUrl = getBackendBaseUrl();

  private async buildAuthResult(
    user: IUserDoc,
    options?: { token?: string }
  ): Promise<AuthServiceResult> {
    const credits = await this.creditsService.getCredits(user);
    const result: AuthServiceResult = {
      user: { ...toUserResponse(user), credits },
    };
    if (options?.token) result.token = options.token;
    return result;
  }

  async signup(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthServiceResult> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already in use');
    }
    const user = await this.userRepository.create({
      name: data.name,
      email: data.email,
      password: data.password,
    });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.userRepository.setVerificationToken(
      user._id.toString(),
      verificationToken,
      verificationExpires
    );
    const verifyUrl = `${this.backendBaseUrl}/api/auth/verify-email?token=${verificationToken}`;
    await this.emailService
      .sendVerificationEmail({ to: user.email, name: user.name, verifyUrl })
      .catch((err) => console.error('[AuthService] sendVerificationEmail failed:', err));
    const token = generateToken(user._id.toString());
    return this.buildAuthResult(user, { token });
  }

  async login(data: { email: string; password: string }): Promise<AuthServiceResult> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    if (!user.password) {
      throw new Error('Invalid credentials');
    }
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    const token = generateToken(user._id.toString());
    return this.buildAuthResult(user, { token });
  }

  async loginWithGoogle(googleIdToken: string): Promise<AuthServiceResult> {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: googleIdToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new Error('Invalid Google token');
    }
    const { email, name, sub: googleId } = payload;
    const displayName = name ?? email.split('@')[0];

    let user = await this.userRepository.findByGoogleId(googleId!);
    if (user) {
      const token = generateToken(user._id.toString());
      return this.buildAuthResult(user, { token });
    }

    user = await this.userRepository.findByEmail(email);
    if (user) {
      const updated = await this.userRepository.updateGoogleId(user._id.toString(), googleId!);
      const target = updated ?? user;
      const token = generateToken(target._id.toString());
      return this.buildAuthResult(target, { token });
    }

    user = await this.userRepository.createFromGoogle({
      name: displayName,
      email,
      googleId: googleId!,
    });
    const token = generateToken(user._id.toString());
    return this.buildAuthResult(user, { token });
  }

  async getProfile(userId: string): Promise<AuthServiceResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return this.buildAuthResult(user);
  }

  async verifyEmail(token: string): Promise<{ status: 'success' | 'expired' }> {
    const user = await this.userRepository.findByVerificationToken(token);
    const notExpired =
      user?.emailVerificationExpires && new Date() <= user.emailVerificationExpires;

    if (user && notExpired) {
      await this.userRepository.setEmailVerifiedAndClearToken(user._id.toString());
      return { status: 'success' };
    }
    return { status: 'expired' };
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.emailVerified) throw new Error('Email already verified');

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepository.setVerificationToken(userId, verificationToken, verificationExpires);

    const verifyUrl = `${this.backendBaseUrl}/api/auth/verify-email?token=${verificationToken}`;
    await this.emailService
      .sendVerificationEmail({ to: user.email, name: user.name, verifyUrl })
      .catch((err) => console.error('[AuthService] sendVerificationEmail failed:', err));
  }
}
