import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService.js';

export class AuthController {
  private readonly authService = new AuthService();

  constructor() {}

  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid data',
          details: errors.array(),
        });
        return;
      }
      const { name, email, password } = req.body as {
        name?: string;
        email?: string;
        password?: string;
      };
      const result = await this.authService.signup({
        name: name!,
        email: email!,
        password: password!,
      });
      res.status(201).json({
        message: 'User created successfully',
        ...result,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Signup failed',
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid data',
          details: errors.array(),
        });
        return;
      }
      const { email, password } = req.body as { email?: string; password?: string };
      const result = await this.authService.login({
        email: email!,
        password: password!,
      });
      res.status(200).json({
        message: 'Login successful',
        ...result,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Invalid credentials',
      });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const result = await this.authService.getProfile(req.user._id.toString());
      res.status(200).json({ user: result.user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(404).json({
        error: error instanceof Error ? error.message : 'User not found',
      });
    }
  };
}
