import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository.js';
import { CreditsService } from './CreditsService.js';
import { generateToken } from '../config/jwt.js';
import { toUserResponse } from '../utils/user.js';

export interface AuthServiceResult {
  user?: Record<string, unknown> & { credits?: number };
  token?: string;
}

export class AuthService {
  private readonly userRepository = new UserRepository();
  private readonly creditsService = new CreditsService();

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
    const token = generateToken(user._id.toString());
    const credits = await this.creditsService.getCredits(user);
    return {
      user: {
        ...toUserResponse(user),
        credits,
      },
      token,
    };
  }

  async login(data: { email: string; password: string }): Promise<AuthServiceResult> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    const token = generateToken(user._id.toString());
    const credits = await this.creditsService.getCredits(user);
    return {
      user: {
        ...toUserResponse(user),
        credits,
      },
      token,
    };
  }

  async getProfile(userId: string): Promise<AuthServiceResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const credits = await this.creditsService.getCredits(user);
    return {
      user: {
        ...toUserResponse(user),
        credits,
      },
    };
  }
}
