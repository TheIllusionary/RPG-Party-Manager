import { Router } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req, res) => {
  try {
    const username = req.body?.username?.trim().toLowerCase();
    const password = req.body?.password;

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ username, passwordHash });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    console.error('POST /auth/register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = req.body?.username?.trim().toLowerCase();
    const password = req.body?.password;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('username createdAt');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user._id, username: user.username, createdAt: user.createdAt });
  } catch (err) {
    console.error('GET /auth/me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
