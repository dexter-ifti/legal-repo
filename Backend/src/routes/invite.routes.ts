import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateInvite } from '../services/invite.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';

const router = Router();

const validateParamsSchema = z.object({
  token: z.string().min(10, 'Invalid invite token'),
});

/**
 * GET /api/v1/invites/validate/:token
 * Public endpoint used by the signup page to display invite context
 * (organization name, invited email, role) before account creation.
 */
router.get('/validate/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = validateParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      sendError(res, 'Invalid invite token', 400, 'VALIDATION_ERROR');
      return;
    }

    const result = await validateInvite(parseResult.data.token);
    sendSuccess(res, result, 200);
    return;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to validate invite';
    sendError(res, message, 500, 'INVITE_VALIDATE_FAILED');
  }
});

export default router;
