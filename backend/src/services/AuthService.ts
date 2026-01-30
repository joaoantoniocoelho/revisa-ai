import type { UserRepository } from '../repositories/UserRepository.js';
import type { UserLimitsService } from './UserLimitsService.js';

export type SignupCommand = {
  type: 'signup';
  name: string;
  email: string;
  password: string;
};

export type LoginCommand = {
  type: 'login';
  email: string;
  password: string;
};

export type GetProfileCommand = { type: 'getProfile'; userId: string };

export type UpdateProfileCommand = {
  type: 'updateProfile';
  userId: string;
  name: string;
};

export type AuthCommand =
  | SignupCommand
  | LoginCommand
  | GetProfileCommand
  | UpdateProfileCommand;

export interface AuthServiceResult {
  user?: Record<string, unknown> & { limits?: unknown };
  token?: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userLimitsService: UserLimitsService,
    private readonly generateToken: (userId: string) => string
  ) {}

  async execute(cmd: AuthCommand): Promise<AuthServiceResult> {
    switch (cmd.type) {
      case 'signup':
        return this.signup(cmd);
      case 'login':
        return this.login(cmd);
      case 'getProfile':
        return this.getProfile(cmd);
      case 'updateProfile':
        return this.updateProfile(cmd);
    }
  }

  private async signup(cmd: SignupCommand): Promise<AuthServiceResult> {
    const existingUser = await this.userRepository.findByEmail(cmd.email);
    if (existingUser) {
      throw new Error('Email já está em uso');
    }
    const user = await this.userRepository.create({
      name: cmd.name,
      email: cmd.email,
      password: cmd.password,
      planType: 'free',
    });
    const token = this.generateToken(user._id.toString());
    const limits = await this.userLimitsService.execute({
      type: 'getUserLimits',
      user,
    });
    return {
      user: {
        ...(user.toJSON() as Record<string, unknown>),
        limits,
      },
      token,
    };
  }

  private async login(cmd: LoginCommand): Promise<AuthServiceResult> {
    const user = await this.userRepository.findByEmail(cmd.email);
    if (!user) {
      throw new Error('Credenciais inválidas');
    }
    const isValid = await user.comparePassword(cmd.password);
    if (!isValid) {
      throw new Error('Credenciais inválidas');
    }
    const token = this.generateToken(user._id.toString());
    const limits = await this.userLimitsService.execute({
      type: 'getUserLimits',
      user,
    });
    return {
      user: {
        ...(user.toJSON() as Record<string, unknown>),
        limits,
      },
      token,
    };
  }

  private async getProfile(cmd: GetProfileCommand): Promise<AuthServiceResult> {
    const user = await this.userRepository.findById(cmd.userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    const limits = await this.userLimitsService.execute({
      type: 'getUserLimits',
      user,
    });
    return {
      user: {
        ...(user.toJSON() as Record<string, unknown>),
        limits,
      },
    };
  }

  private async updateProfile(cmd: UpdateProfileCommand): Promise<AuthServiceResult> {
    const user = await this.userRepository.update(cmd.userId, { name: cmd.name });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    return { user: user.toJSON() as Record<string, unknown> };
  }
}
