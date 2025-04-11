import { Request, Response } from 'express';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Register controller
export async function register(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = insertUserSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ message: validatedData.error.message });
    }

    const { email, password, displayName } = validatedData.data;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      displayName,
      isAdmin: false,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(201).json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Login controller
export async function login(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = loginSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ message: validatedData.error.message });
    }

    const { email, password } = validatedData.data;

    // Get user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Update last login time
    await storage.updateUserLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Logout controller
export async function logout(req: Request, res: Response) {
  // Clear cookie
  res.clearCookie(COOKIE_NAME);
  return res.status(200).json({ message: 'Logged out successfully' });
}

// Get current user controller
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // Check if user is authenticated (set by middleware)
    if (req.user) {
      const { password, ...userWithoutPassword } = req.user;
      return res.status(200).json({ user: userWithoutPassword });
    }
    
    return res.status(401).json({ message: 'Not authenticated' });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
