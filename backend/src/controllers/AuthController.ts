import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService.js';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '../config/authCookie.js';

function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  });
}

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';

function getSafeRedirectOrigin(): string {
  const raw = process.env.FRONTEND_URL;
  if (!raw || typeof raw !== 'string') return DEFAULT_FRONTEND_ORIGIN;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return DEFAULT_FRONTEND_ORIGIN;
    return u.origin;
  } catch {
    return DEFAULT_FRONTEND_ORIGIN;
  }
}

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
      res.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());
      res.status(201).json({
        message: 'User created successfully',
        user: result.user,
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
      res.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());
      res.status(200).json({
        message: 'Login successful',
        user: result.user,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Invalid credentials',
      });
    }
  };

  loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid data',
          details: errors.array(),
        });
        return;
      }
      const { credential } = req.body as { credential?: string };
      const result = await this.authService.loginWithGoogle(credential!);
      res.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());
      res.status(200).json({
        message: 'Login successful',
        user: result.user,
      });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Google login failed',
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

  /** User clicks link in email (backend URL). We verify and redirect to front with status. */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    let status: 'success' | 'expired' = 'expired';
    try {
      status = (await this.authService.verifyEmail(token)).status;
    } catch (error) {
      console.error('Verify email error:', error);
    }
    const origin = getSafeRedirectOrigin();
    res.redirect(302, `${origin}/email-verified?status=${status}`);
  };

  resendVerification = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      await this.authService.resendVerificationEmail(req.user._id.toString());
      res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
      console.error('Resend verification error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to resend';
      const status = msg.includes('already verified') ? 400 : msg.includes('Aguarde') ? 429 : 500;
      res.status(status).json({ error: msg });
    }
  };

  logout = (_req: Request, res: Response): void => {
    clearAuthCookie(res);
    res.status(200).json({ message: 'Logged out' });
  };
}
