import { Router, Response } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, logoutUser, requestPasswordReset } from '../services/auth.service.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/api-response.js';

const router = Router();

const signUpSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format'),
});

router.post('/signup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = signUpSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    const { email, password, name } = parseResult.data;
    // Optional invite token: when valid, the account joins the inviting
    // tenant with the invited role instead of self-provisioning a new one.
    const inviteToken =
      typeof req.body?.inviteToken === 'string' ? req.body.inviteToken : null;
    const result = await registerUser(email, password, name, inviteToken);

    return sendSuccess(res, result, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    return sendError(res, message, 400, 'SIGNUP_FAILED');
  }
});

router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = signInSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    const { email, password } = parseResult.data;
    const result = await loginUser(email, password);

    return sendSuccess(res, result, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return sendError(res, message, 401, 'INVALID_CREDENTIALS');
  }
});

router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    if (token) {
      await logoutUser(token);
    }
    return sendSuccess(res, { message: 'Successfully logged out' }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Logout failed';
    return sendError(res, message, 500, 'LOGOUT_FAILED');
  }
});

router.post('/forgot-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    const { email } = parseResult.data;
    await requestPasswordReset(email);

    return sendSuccess(res, { message: 'Password reset instructions sent to email' }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password reset request failed';
    return sendError(res, message, 400, 'FORGOT_PASSWORD_FAILED');
  }
});

router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return sendSuccess(res, { user: req.user }, 200);
});

export default router;
