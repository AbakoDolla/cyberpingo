import { hashPassword, verifyPassword } from '../src/utils/password';
import { signToken, verifyToken } from '../src/utils/jwt';

describe('password hashing', () => {
  it('never stores the plaintext password', async () => {
    const hash = await hashPassword('CorrectHorseBatteryStaple1!');

    expect(hash).not.toContain('CorrectHorseBatteryStaple1!');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('CorrectHorseBatteryStaple1!');

    await expect(verifyPassword('CorrectHorseBatteryStaple1!', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});

describe('jwt helpers', () => {
  it('round-trips an access token payload', () => {
    const token = signToken('access', { sub: 'user-id', username: 'pingo' });

    expect(verifyToken('access', token)).toMatchObject({ sub: 'user-id', username: 'pingo' });
  });

  it('rejects an access token signed with the refresh secret', () => {
    const token = signToken('refresh', { sub: 'user-id', username: 'pingo' });

    expect(() => verifyToken('access', token)).toThrow();
  });
});
