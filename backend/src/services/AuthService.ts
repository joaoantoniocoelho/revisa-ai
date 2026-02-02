import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository.js';
import { UserLimitsService } from './UserLimitsService.js';
import { generateToken } from '../config/jwt.js';
import { toUserResponse } from '../utils/user.js';

export interface AuthServiceResult {
  user?: Record<string, unknown> & { limits?: unknown };
  token?: string;
}

export class AuthService {
  private readonly userRepository = new UserRepository();
  private readonly userLimitsService = new UserLimitsService();

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
      planType: 'free',
    });
    const token = generateToken(user._id.toString());
    const limits = await this.userLimitsService.getUserLimits(user);
    return {
      user: {
        ...toUserResponse(user),
        limits,
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
    const limits = await this.userLimitsService.getUserLimits(user);
    return {
      user: {
        ...toUserResponse(user),
        limits,
      },
      token,
    };
  }

  async getProfile(userId: string): Promise<AuthServiceResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const limits = await this.userLimitsService.getUserLimits(user);
    return {
      user: {
        ...toUserResponse(user),
        limits,
      },
    };
  }
}
