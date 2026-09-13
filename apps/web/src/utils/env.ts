/**
 * Frontend runtime configuration.
 *
 * Only `VITE_*` variables exist in the browser bundle. Backend secrets must
 * never be referenced from this app.
 */
export const apiUrl: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
