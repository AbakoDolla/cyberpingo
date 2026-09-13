import type { HealthStatus } from '@cyberpingo/types';

import { SERVICE_NAME, SERVICE_VERSION } from '../../config/constants';

/** Builds the liveness payload used by Docker, CI and uptime monitoring. */
export const getHealthStatus = (): HealthStatus => ({
  status: 'ok',
  service: SERVICE_NAME,
  version: SERVICE_VERSION,
  uptime: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
});
