import { Router } from 'express';
import usersRoutes from './users.routes';
import promptsRoutes from './prompts.routes';
import jobsRoutes from './jobs.routes';
import adminRoutes from './admin.routes';
import userProfileRoutes from './user-profile.routes';
import authRoutes from './auth.routes';
import oauthCallbackRoutes from './oauth-callback.routes';
import publicRoutes from './public.routes';

const router = Router();

// Health check (no auth)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route groups
router.use('/auth', authRoutes);
router.use('/auth', oauthCallbackRoutes);  // OAuth callback routes
router.use('/public', publicRoutes);         // New public API
router.use('/users', usersRoutes);
router.use('/users', promptsRoutes);  // Mounted under /users/:id/prompts/*
router.use('/users', userProfileRoutes);  // Mounted under /users/:id/profile, /emails, /analytics, etc.
router.use('/jobs', jobsRoutes);
router.use('/admin', adminRoutes);

export default router;
