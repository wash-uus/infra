import { Request, Response, NextFunction } from 'express';
import { admin } from '../config/firebase';
import { AuthRequest } from '../types';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Missing Bearer token' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as AuthRequest).user = {
      uid:             decoded.uid,
      email:           decoded.email,
      isAdmin:         decoded.isAdmin === true,
      subscriptionTier: decoded.subscriptionTier as string | undefined,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!(req as AuthRequest).user?.isAdmin) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
}
