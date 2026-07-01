import jwt from 'jsonwebtoken';
import { CLOUD_DEFAULTS } from '../../shared/cloudDefaults.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || CLOUD_DEFAULTS.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return secret;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
