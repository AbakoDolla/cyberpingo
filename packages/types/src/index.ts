/**
 * Shared CyberPingo domain types.
 *
 * These types describe the public API contract only. Runtime validation stays
 * the responsibility of the backend (Zod schemas in `apps/api`).
 */
export * from './common.js';
export * from './user.js';
export * from './course.js';
export * from './lesson.js';
export * from './challenge.js';
export * from './progress.js';
export * from './gamification.js';
