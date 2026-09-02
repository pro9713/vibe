/**
 * Lightweight Persistent Execution Logger and Health Tracker for Monitoring Jobs
 */

export type ExecutionStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" | "LOCKED" | "RUNNING";

export interface MonitoringExecutionRecord {
  executionId: string;
  startedAt: string;
  completedAt?: string;
  status: ExecutionStatus;
  targetsProcessed: number;
  successfulChecks: number;
  failedChecks: number;
  alertsGenerated: number;
  skippedCount: number;
  retries: number;
  durationMs: number;
  errors?: string[];
  lockAcquired: boolean;
}

export interface MonitoringHealthStatus {
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "IDLE";
  isRunning: boolean;
  totalExecutions: number;
  lastExecution?: MonitoringExecutionRecord;
  lastSuccessfulRun?: string;
  lastFailedRun?: string;
  averageDurationMs: number;
  failureRatePercentage: number;
}

const MAX_LOGS = 50;
const executionLogs: MonitoringExecutionRecord[] = [];

/**
 * Records an execution record into history.
 */
export function recordExecutionLog(record: MonitoringExecutionRecord): void {
  executionLogs.unshift(record);
  if (executionLogs.length > MAX_LOGS) {
    executionLogs.pop();
  }
}

/**
 * Retrieves the recent execution history.
 */
export function getExecutionHistory(limit: number = 20): MonitoringExecutionRecord[] {
  return executionLogs.slice(0, limit);
}

/**
 * Clears execution logs (for testing).
 */
export function clearExecutionLogs(): void {
  executionLogs.length = 0;
}

/**
 * Computes overall health metrics from recent execution history.
 */
export function getMonitoringHealth(): MonitoringHealthStatus {
  if (executionLogs.length === 0) {
    return {
      status: "IDLE",
      isRunning: false,
      totalExecutions: 0,
      averageDurationMs: 0,
      failureRatePercentage: 0,
    };
  }

  const lastExec = executionLogs[0];
  const successfulRuns = executionLogs.filter((r) => r.status === "SUCCESS" || r.status === "PARTIAL_SUCCESS");
  const failedRuns = executionLogs.filter((r) => r.status === "FAILED");

  const lastSuccessful = successfulRuns.length > 0 ? successfulRuns[0].completedAt || successfulRuns[0].startedAt : undefined;
  const lastFailed = failedRuns.length > 0 ? failedRuns[0].completedAt || failedRuns[0].startedAt : undefined;

  const totalDuration = executionLogs.reduce((acc, r) => acc + (r.durationMs || 0), 0);
  const averageDurationMs = Math.round(totalDuration / executionLogs.length);

  const failureRatePercentage = Number(((failedRuns.length / executionLogs.length) * 100).toFixed(1));

  let overallStatus: "HEALTHY" | "DEGRADED" | "UNHEALTHY" = "HEALTHY";
  if (failureRatePercentage > 50) {
    overallStatus = "UNHEALTHY";
  } else if (failureRatePercentage > 15 || lastExec.status === "PARTIAL_SUCCESS") {
    overallStatus = "DEGRADED";
  }

  return {
    status: overallStatus,
    isRunning: lastExec.status === "RUNNING",
    totalExecutions: executionLogs.length,
    lastExecution: lastExec,
    lastSuccessfulRun: lastSuccessful,
    lastFailedRun: lastFailed,
    averageDurationMs,
    failureRatePercentage,
  };
}
