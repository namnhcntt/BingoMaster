import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const COOKIE_NAME = 'auth_token';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Auth middleware
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from cookie
    const token = req.cookies?.[COOKIE_NAME];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    
    // Get user from database
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Set user to request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Optional auth middleware (for routes that work with or without authentication)
export async function authOptionalMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from cookie
    const token = req.cookies?.[COOKIE_NAME];
    
    if (!token) {
      // Continue without user
      return next();
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      
      // Get user from database
      const user = await storage.getUser(decoded.id);
      
      if (user) {
        // Set user to request object
        req.user = user;
      }
    } catch (tokenError) {
      // Invalid token, but we don't return an error for optional auth
      console.warn('Invalid token in optional auth:', tokenError.message);
    }
    
    next();
  } catch (error) {
    console.error('Auth optional middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin middleware
export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // First run auth middleware
    await authMiddleware(req, res, async () => {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Admin privileges required' });
      }
      
      next();
    });
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
