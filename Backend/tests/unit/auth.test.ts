import test from 'node:test';
import assert from 'node:assert';
import { MockAuthProvider } from '../../src/auth/MockAuthProvider.js';
import { SupabaseAuthProvider } from '../../src/auth/SupabaseAuthProvider.js';
import { DEMO_USERS, DEMO_ORGANIZATION_IDS } from '../../src/auth/demo-users.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  await t.test('demo sign-in returns deterministic UUID user id and matching token', async () => {
    const demoResult = await authProvider.signIn(DEMO_USERS.sarahMitchell.email, 'any-password');
    assert.match(demoResult.user.id, UUID_REGEX);
    assert.strictEqual(demoResult.user.id, DEMO_USERS.sarahMitchell.id);
    assert.strictEqual(demoResult.session.token, `mock-token-${demoResult.user.id}`);

    const verified = await authProvider.verifyToken(demoResult.session.token);
    assert.strictEqual(verified.id, DEMO_USERS.sarahMitchell.id);
  });

  await t.test('demo sign-in via email containing "demo" also returns a UUID id', async () => {
    const demoResult = await authProvider.signIn('someone@demo.com', 'password');
    assert.match(demoResult.user.id, UUID_REGEX);
    assert.strictEqual(demoResult.session.token, `mock-token-${demoResult.user.id}`);
  });
});

test('SupabaseAuthProvider demo token fallback uses valid UUID ids', async (t) => {
  const provider = new SupabaseAuthProvider();

  await t.test('mock token resolves to deterministic UUID demo user', async () => {
    const user = await provider.verifyToken('mock-token-any-value');
    assert.match(user.id, UUID_REGEX);
    assert.strictEqual(user.id, DEMO_USERS.sarahMitchell.id);
  });

  await t.test('legacy demo-token still resolves to the same UUID demo user', async () => {
    const user = await provider.verifyToken('demo-token');
    assert.strictEqual(user.id, DEMO_USERS.sarahMitchell.id);
  });
});

test('demo organization fallback IDs are valid UUIDs', () => {
  for (const orgId of Object.values(DEMO_ORGANIZATION_IDS)) {
    assert.match(orgId, UUID_REGEX);
  }
});
