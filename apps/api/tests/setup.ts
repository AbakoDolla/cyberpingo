/**
 * Test environment defaults.
 *
 * These are throwaway values used only by the test runner; real secrets live in
 * `.env` files that are never committed.
 */
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] ??=
  'postgresql://cyberpingo:cyberpingo@localhost:5432/cyberpingo_test?schema=public';
process.env['JWT_ACCESS_SECRET'] ??= 'test-access-secret-value-0123456789';
process.env['JWT_REFRESH_SECRET'] ??= 'test-refresh-secret-value-0123456789';
