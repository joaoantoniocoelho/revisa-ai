import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/AuthController.js';
import { createAuthenticate } from '../middlewares/auth.js';
import {
  createInMemoryRateLimiter,
  emailKeyFromBody,
  ipKey,
  userKey,
} from '../middlewares/rateLimit.js';

export function createAuthRouter(): Router {
  const authController = new AuthController();
  const authenticate = createAuthenticate();
  const router = Router();

  const loginByIpLimiter = createInMemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: ipKey,
    message: 'Too many login attempts. Please try again in a few minutes.',
  });
  const loginByEmailLimiter = createInMemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 6,
    keyGenerator: emailKeyFromBody,
    message: 'Too many attempts for this email. Please wait and try again.',
  });
  const signupByIpLimiter = createInMemoryRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: ipKey,
    message: 'Too many signups from this IP. Please try again later.',
  });
  const googleByIpLimiter = createInMemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    keyGenerator: ipKey,
    message: 'Too many Google login attempts. Please try again shortly.',
  });
  const resendByUserLimiter = createInMemoryRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyGenerator: userKey,
    message: 'Too many resend requests. Please wait before trying again.',
  });
  const resendByIpLimiter = createInMemoryRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: ipKey,
    message: 'Resend request limit reached for this IP. Please wait a bit.',
  });

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

  const googleValidation = [
    body('credential').notEmpty().withMessage('Credential is required'),
  ];

  router.post('/signup', signupByIpLimiter, signupValidation, authController.signup);
  router.post('/login', loginByIpLimiter, loginByEmailLimiter, loginValidation, authController.login);
  router.post('/google', googleByIpLimiter, googleValidation, authController.loginWithGoogle);
  router.get('/profile', authenticate, authController.getProfile);
  router.get('/verify-email', authController.verifyEmail);
  router.post(
    '/resend-verification',
    authenticate,
    resendByUserLimiter,
    resendByIpLimiter,
    authController.resendVerification
  );
  router.post('/logout', authController.logout);

  return router;
}
