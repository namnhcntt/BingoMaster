import { Request, Response } from 'express';
import { storage } from '../storage';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { generateRandomPassword } from '../utils/helpers';

// Get admin stats
export async function getStats(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get stats
    const stats = await storage.getAdminStats();
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get users
export async function getUsers(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get users
    const users = await storage.getAllUsers();
    return res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create user
export async function createUser(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate request body
    const userSchema = z.object({
      email: z.string().email(),
      displayName: z.string().min(2),
      password: z.string().min(6),
      isAdmin: z.boolean().default(false),
    });

    const validatedData = userSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ message: validatedData.error.message });
    }

    const { email, displayName, password, isAdmin } = validatedData.data;

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
      displayName,
      password: hashedPassword,
      isAdmin,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Update user
export async function updateUser(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId } = req.params;
    const id = parseInt(userId);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Validate request body
    const userSchema = z.object({
      email: z.string().email(),
      displayName: z.string().min(2),
      password: z.string().min(6).optional(),
      isAdmin: z.boolean(),
    });

    const validatedData = userSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ message: validatedData.error.message });
    }

    const { email, displayName, password, isAdmin } = validatedData.data;

    // Check if user exists
    const existingUser = await storage.getUser(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    const userWithEmail = await storage.getUserByEmail(email);
    if (userWithEmail && userWithEmail.id !== id) {
      return res.status(400).json({ message: 'Email is already taken by another user' });
    }

    // Update user
    let updatedUser;
    if (password) {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedUser = await storage.updateUser(id, {
        email,
        displayName,
        password: hashedPassword,
        isAdmin,
      });
    } else {
      updatedUser = await storage.updateUser(id, {
        email,
        displayName,
        isAdmin,
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Delete user
export async function deleteUser(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId } = req.params;
    const id = parseInt(userId);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Check if user exists
    const existingUser = await storage.getUser(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admins from deleting themselves
    if (existingUser.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Delete user
    await storage.deleteUser(id);

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Reset password
export async function resetPassword(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId } = req.params;
    const id = parseInt(userId);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Check if user exists
    const existingUser = await storage.getUser(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new random password
    const temporaryPassword = generateRandomPassword(12);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Update user's password
    await storage.updateUser(id, {
      password: hashedPassword,
    });

    // In a real application, you would send an email with the temporary password here
    // For now, return the temporary password in the response
    return res.status(200).json({ 
      message: 'Password reset successfully', 
      temporaryPassword 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get API providers
export async function getProviders(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get providers
    const providers = await storage.getAllProviders();
    return res.status(200).json(providers);
  } catch (error) {
    console.error('Get providers error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create API provider
export async function createProvider(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate request body
    const providerSchema = z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      apiKey: z.string().min(1),
      apiEndpoint: z.string().optional(),
      description: z.string().optional(),
    });

    const validatedData = providerSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ message: validatedData.error.message });
    }

    const { name, type, apiKey, apiEndpoint, description } = validatedData.data;

    // Create provider
    const provider = await storage.createProvider({
      name,
      type,
      apiKey,
      apiEndpoint,
      description,
      isActive: false, // New providers are inactive by default
    });

    return res.status(201).json(provider);
  } catch (error) {
    console.error('Create provider error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Update API provider
export async function updateProvider(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { providerId } = req.params;

    // Validate request body
    const providerSchema = z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      apiKey: z.string().min(1),
      apiEndpoint: z.string().optional(),
      description: z.string().optional(),
    });

    const validatedData = providerSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ message: validatedData.error.message });
    }

    const { name, type, apiKey, apiEndpoint, description } = validatedData.data;

    // Check if provider exists
    const existingProvider = await storage.getProvider(providerId);
    if (!existingProvider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Update provider
    const updatedProvider = await storage.updateProvider(providerId, {
      name,
      type,
      apiKey,
      apiEndpoint,
      description,
      // Don't change the active status here
    });

    return res.status(200).json(updatedProvider);
  } catch (error) {
    console.error('Update provider error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Delete API provider
export async function deleteProvider(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { providerId } = req.params;

    // Check if provider exists
    const existingProvider = await storage.getProvider(providerId);
    if (!existingProvider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Delete provider
    await storage.deleteProvider(providerId);

    return res.status(200).json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Activate API provider
export async function activateProvider(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { providerId } = req.params;

    // Check if provider exists
    const existingProvider = await storage.getProvider(providerId);
    if (!existingProvider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Activate provider (deactivates all others)
    const activatedProvider = await storage.activateProvider(providerId);

    return res.status(200).json(activatedProvider);
  } catch (error) {
    console.error('Activate provider error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Test API provider
export async function testProvider(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { providerId } = req.params;
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ message: 'Valid prompt is required' });
    }

    // Check if provider exists
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Import aiService for testing
    const { testProvider } = await import('../services/aiService');
    
    // Test the provider
    const result = await testProvider(provider, prompt);

    return res.status(200).json({ result });
  } catch (error) {
    console.error('Test provider error:', error);
    return res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: error.toString()
    });
  }
}
