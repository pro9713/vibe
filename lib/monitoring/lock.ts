/**
 * Production Job Locking Mechanism for Pricely Background Monitoring
 * Prevents overlapping cron jobs, handles stale lock expiration, and guarantees safe release.
 */

export interface JobLock {
  locked: boolean;
  lockedAt?: number;
  lockedBy?: string;
  expiresAt?: number;
}

const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes lock TTL

let activeLock: JobLock = {
  locked: false,
};

/**
 * Attempts to acquire an exclusive execution lock.
 * Returns true if lock was acquired, false if a non-expired lock is already active.
 */
export function acquireJobLock(
  executionId: string,
  ttlMs: number = DEFAULT_LOCK_TTL_MS
): boolean {
  const now = Date.now();

  // If locked, check if the lock has expired (stale lock recovery)
  if (activeLock.locked) {
    if (activeLock.expiresAt && now < activeLock.expiresAt) {
      console.warn(
        `[JobLock] Execution ${executionId} rejected: Active lock held by ${activeLock.lockedBy} until ${new Date(activeLock.expiresAt).toISOString()}`
      );
      return false;
    }
    console.warn(`[JobLock] Recovered from stale lock held by ${activeLock.lockedBy}`);
  }

  activeLock = {
    locked: true,
    lockedAt: now,
    lockedBy: executionId,
    expiresAt: now + ttlMs,
  };

  return true;
}

/**
 * Releases the lock held by the given execution ID.
 */
export function releaseJobLock(executionId: string): boolean {
  if (activeLock.locked && (activeLock.lockedBy === executionId || !activeLock.lockedBy)) {
    activeLock = {
      locked: false,
    };
    return true;
  }
  return false;
}

/**
 * Gets the current lock status.
 */
export function getJobLockStatus(): JobLock {
  const now = Date.now();
  if (activeLock.locked && activeLock.expiresAt && now >= activeLock.expiresAt) {
    return { locked: false };
  }
  return { ...activeLock };
}

/**
 * Resets lock state (used for testing).
 */
export function resetJobLock(): void {
  activeLock = { locked: false };
}
