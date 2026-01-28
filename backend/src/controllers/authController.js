import authService from '../services/authService.js';
import { validationResult } from 'express-validator';

class AuthController {
  async signup(req, res) {
    try {
      // Validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: errors.array() 
        });
      }

      const { name, email, password } = req.body;
      const result = await authService.signup(name, email, password);

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        ...result,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      // Validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: errors.array() 
        });
      }

      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.status(200).json({
        message: 'Login realizado com sucesso',
        ...result,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      
      res.status(200).json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(404).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const { name } = req.body;
      const user = await authService.updateProfile(req.user.id, { name });
      
      res.status(200).json({ 
        message: 'Perfil atualizado com sucesso',
        user 
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({ error: error.message });
    }
  }
}

export default new AuthController();
