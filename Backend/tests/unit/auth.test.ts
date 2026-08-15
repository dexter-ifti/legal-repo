import test from 'node:test';
import assert from 'node:assert';
import { MockAuthProvider } from '../../src/auth/MockAuthProvider.js';

test('MockAuthProvider Unit Tests', async (t) => {
  const authProvider = new MockAuthProvider();

  await t.test('signUp creates user session', async () => {
    const result = await authProvider.signUp('advocate@chambers.com', 'SecurePass123!', 'John Doe');
    assert.strictEqual(result.user.email, 'advocate@chambers.com');
    assert.strictEqual(result.user.name, 'John Doe');
    assert.ok(result.session?.token);
  });

  await t.test('signUp rejects duplicate user', async () => {
    await assert.rejects(
      async () => {
        await authProvider.signUp('advocate@chambers.com', 'SecurePass123!');
      },
      { message: 'User already registered' }
    );
  });

  await t.test('signIn verifies valid credentials', async () => {
    const loginResult = await authProvider.signIn('advocate@chambers.com', 'SecurePass123!');
    assert.strictEqual(loginResult.user.email, 'advocate@chambers.com');
    assert.ok(loginResult.session.token);
  });

  await t.test('signIn rejects invalid password', async () => {
    await assert.rejects(
      async () => {
        await authProvider.signIn('advocate@chambers.com', 'WrongPassword');
      },
      { message: 'Invalid login credentials' }
    );
  });

  await t.test('verifyToken verifies valid active token', async () => {
    const loginResult = await authProvider.signIn('advocate@chambers.com', 'SecurePass123!');
    const verifiedUser = await authProvider.verifyToken(loginResult.session.token);
    assert.strictEqual(verifiedUser.email, 'advocate@chambers.com');
  });

  await t.test('signOut revokes token', async () => {
    const loginResult = await authProvider.signIn('advocate@chambers.com', 'SecurePass123!');
    await authProvider.signOut(loginResult.session.token);
    await assert.rejects(
      async () => {
        await authProvider.verifyToken(loginResult.session.token);
      },
      { message: 'Invalid or expired authentication token' }
    );
  });
});
