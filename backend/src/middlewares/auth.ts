import type { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { UserRepository } from '../repositories/UserRepository.js';
import { verifyToken } from '../config/jwt.js';

export function createAuthenticate() {
  const userRepository = new UserRepository();
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cookieToken = req.cookies?.token;
      const token = cookieToken;
      if (!token) {
        res.status(401).json({ error: 'Token not provided' });
        return;
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      const user = await userRepository.findById(decoded.id);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
