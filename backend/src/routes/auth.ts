import { Router } from 'express';
import { body } from 'express-validator';
import type { AuthController } from '../controllers/AuthController.js';
import type { RequestHandler } from 'express';

export function createAuthRouter(
  authController: AuthController,
  authenticate: RequestHandler
): Router {
  const router = Router();

  const signupValidation: RequestHandler[] = [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter no mínimo 6 caracteres'),
  ];

  const loginValidation: RequestHandler[] = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
  ];

  router.post('/signup', signupValidation, authController.signup);
  router.post('/login', loginValidation, authController.login);
  router.get('/profile', authenticate, authController.getProfile);
  router.put('/profile', authenticate, authController.updateProfile);

  return router;
}
