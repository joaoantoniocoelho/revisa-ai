import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import type { AuthService } from '../services/AuthService.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array(),
        });
        return;
      }
      const { name, email, password } = req.body as {
        name?: string;
        email?: string;
        password?: string;
      };
      const result = await this.authService.execute({
        type: 'signup',
        name: name!,
        email: email!,
        password: password!,
      });
      res.status(201).json({
        message: 'Usuário criado com sucesso',
        ...result,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao cadastrar',
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array(),
        });
        return;
      }
      const { email, password } = req.body as { email?: string; password?: string };
      const result = await this.authService.execute({
        type: 'login',
        email: email!,
        password: password!,
      });
      res.status(200).json({
        message: 'Login realizado com sucesso',
        ...result,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Credenciais inválidas',
      });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const result = await this.authService.execute({
        type: 'getProfile',
        userId: req.user._id.toString(),
      });
      res.status(200).json({ user: result.user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Usuário não encontrado',
      });
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const { name } = req.body as { name?: string };
      const result = await this.authService.execute({
        type: 'updateProfile',
        userId: req.user._id.toString(),
        name: name!,
      });
      res.status(200).json({
        message: 'Perfil atualizado com sucesso',
        user: result.user,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao atualizar',
      });
    }
  };
}
