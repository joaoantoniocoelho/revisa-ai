import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/AuthController.js';
import { createAuthenticate } from '../middlewares/auth.js';

export function createAuthRouter(): Router {
  const authController = new AuthController();
  const authenticate = createAuthenticate();
  const router = Router();

  const signupValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ];

  const loginValidation = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ];

  router.post('/signup', signupValidation, authController.signup);
  router.post('/login', loginValidation, authController.login);
  router.get('/profile', authenticate, authController.getProfile);

  return router;
}
