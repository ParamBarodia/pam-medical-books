// Daily cleanup job — drops expired OTPs and admin sessions.
// Runs in-process via setInterval. For multi-instance deploys, prefer an
// external cron (Render cron job / GitHub Actions / AWS EventBridge) hitting
// an HTTP endpoint that calls these functions, so cleanup happens once
// across the cluster instead of N times.

import { logger } from '../logger.js';
import { purgeExpiredOtps, purgeExpiredAdminSessions } from '../services/otp.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function runCleanupOnce() {
  try {
    const otps = purgeExpiredOtps();
    const sessions = purgeExpiredAdminSessions();
    if (otps || sessions) {
      logger.info({ purgedOtps: otps, purgedSessions: sessions }, 'daily cleanup ran');
    }
    return { otps, sessions };
  } catch (err) {
    logger.error({ err }, 'daily cleanup failed');
    return { error: err.message };
  }
}

export function scheduleDailyCleanup() {
  // Run once on startup (within a short delay so it doesn't block boot)
  setTimeout(runCleanupOnce, 30_000);
  // Then once per day
  const handle = setInterval(runCleanupOnce, ONE_DAY_MS);
  if (handle.unref) handle.unref();        // don't keep the process alive solely for this
  logger.info({ intervalMs: ONE_DAY_MS }, 'daily cleanup scheduled');
}
