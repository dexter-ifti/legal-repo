import test from 'node:test';
import assert from 'node:assert';
import { Response } from 'express';
import { sendSuccess, sendError } from '../../src/utils/api-response.js';

interface MockResponsePayload {
  statusCode: number;
  data: unknown;
}

const createMockResponse = (): { res: Response; payload: MockResponsePayload } => {
  const payload: MockResponsePayload = {
    statusCode: 200,
    data: null,
  };

  const res = {
    status(code: number) {
      payload.statusCode = code;
      return this;
    },
    json(data: unknown) {
      payload.data = data;
      return this;
    },
  } as unknown as Response;

  return { res, payload };
};

test('API Response Builder Unit Tests', async (t) => {
  await t.test('sendSuccess constructs correct payload structure', () => {
    const { res, payload } = createMockResponse();
    sendSuccess(res, { message: 'hello' }, 200, { total: 1 });

    assert.strictEqual(payload.statusCode, 200);
    const data = payload.data as { success: boolean; data: { message: string }; meta?: { total: number }; timestamp: string };
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.message, 'hello');
    assert.strictEqual(data.meta?.total, 1);
    assert.ok(data.timestamp);
  });

  await t.test('sendError constructs correct error payload structure', () => {
    const { res, payload } = createMockResponse();
    sendError(res, 'Unauthorized access', 401, 'UNAUTHORIZED');

    assert.strictEqual(payload.statusCode, 401);
    const data = payload.data as { success: boolean; error: { code: string; message: string }; timestamp: string };
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    assert.strictEqual(data.error.message, 'Unauthorized access');
    assert.ok(data.timestamp);
  });
});
