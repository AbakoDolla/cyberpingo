import request from 'supertest';

import { createApp } from '../src/app';
import { API_PREFIX } from '../src/config/constants';

describe('Express application', () => {
  const app = createApp();

  it('reports a healthy service', async () => {
    const response = await request(app).get(`${API_PREFIX}/health`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'cyberpingo-api' });
  });

  it('returns a normalized 404 for unknown routes', async () => {
    const response = await request(app).get(`${API_PREFIX}/does-not-exist`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('exposes security headers set by helmet', async () => {
    const response = await request(app).get(`${API_PREFIX}/health`);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
