import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS, hashPassword } from './password';

describe('hashPassword', () => {
  it('returns a bcrypt hash that matches only the original password', async () => {
    const hash = await hashPassword('Demo1234!');

    expect(typeof hash).toBe('string');
    await expect(bcrypt.compare('Demo1234!', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('wrong', hash)).resolves.toBe(false);
  });

  it('hashes with BCRYPT_SALT_ROUNDS', async () => {
    const hash = await hashPassword('Demo1234!');

    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_SALT_ROUNDS);
  });
});
