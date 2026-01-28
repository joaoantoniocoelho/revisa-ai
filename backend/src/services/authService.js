import userRepository from '../repositories/userRepository.js';
import userLimitsService from './userLimitsService.js';
import { generateToken } from '../config/jwt.js';

class AuthService {
  async signup(name, email, password) {
    // Verifica se usu?rio j? existe
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email j? est? em uso');
    }

    // Cria novo usu?rio
    const user = await userRepository.create({
      name,
      email,
      password,
      planType: 'free',
    });

    // Gera token
    const token = generateToken(user._id);

    // Busca limites do usu?rio
    const limits = await userLimitsService.getUserLimits(user);

    return {
      user: {
        ...user.toJSON(),
        limits,
      },
      token,
    };
  }

  async login(email, password) {
    // Busca usu?rio com senha
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Credenciais inv?lidas');
    }

    // Verifica senha
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Credenciais inv?lidas');
    }

    // Gera token
    const token = generateToken(user._id);

    // Busca limites do usu?rio
    const limits = await userLimitsService.getUserLimits(user);

    return {
      user: {
        ...user.toJSON(),
        limits,
      },
      token,
    };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usu?rio n?o encontrado');
    }

    // Busca limites do usu?rio
    const limits = await userLimitsService.getUserLimits(user);

    return {
      ...user.toJSON(),
      limits,
    };
  }

  async updateProfile(userId, updateData) {
    const user = await userRepository.update(userId, updateData);
    if (!user) {
      throw new Error('Usu?rio n?o encontrado');
    }

    return user.toJSON();
  }
}

export default new AuthService();
