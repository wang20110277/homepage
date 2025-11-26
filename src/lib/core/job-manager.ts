import { randomUUID } from "crypto";
import type { Job, JobStatus, ApiError } from "./types";
import { logInfo, logError } from "./logger";

/**
 * Job manager for async task tracking
 *
 * Current implementation: In-memory storage
 * Future implementation: Redis, database, or distributed cache
 *
 * This provides a scaffold for handling long-running tasks where:
 * 1. Client submits a request
 * 2. Server returns a job ID immediately
 * 3. Client polls for job status
 * 4. Server updates job as it progresses
 */

/**
 * In-memory job store
 * WARNING: This is lost on server restart
 * For production, use Redis or database
 */
const jobStore = new Map<string, Job>();

/**
 * Maximum number of jobs to keep in memory
 */
const MAX_JOBS = 1000;

/**
 * Job expiration time in milliseconds (1 hour)
 */
const JOB_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Clean up old jobs to prevent memory leaks
 */
function cleanupOldJobs(): void {
  const now = new Date();
  const keysToDelete: string[] = [];

  for (const [id, job] of jobStore.entries()) {
    const age = now.getTime() - job.updatedAt.getTime();
    if (age > JOB_EXPIRATION_MS) {
      keysToDelete.push(id);
    }
  }

  for (const key of keysToDelete) {
    jobStore.delete(key);
  }

  // If still too many jobs, remove oldest
  if (jobStore.size > MAX_JOBS) {
    const sortedJobs = Array.from(jobStore.entries()).sort(
      ([, a], [, b]) => a.updatedAt.getTime() - b.updatedAt.getTime()
    );

    const toRemove = jobStore.size - MAX_JOBS;
    for (let i = 0; i < toRemove; i++) {
      jobStore.delete(sortedJobs[i][0]);
    }
  }
}

/**
 * Create a new job
 */
export function createJob<T = unknown>(traceId?: string): Job<T> {
  cleanupOldJobs();

  const now = new Date();
  const job: Job<T> = {
    id: randomUUID(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
    traceId,
  };

  jobStore.set(job.id, job as Job);

  logInfo(traceId || job.id, "Job created", {
    jobId: job.id,
  });

  return job;
}

/**
 * Get a job by ID
 */
export function getJob<T = unknown>(jobId: string): Job<T> | null {
  const job = jobStore.get(jobId);
  return (job as Job<T>) || null;
}

/**
 * Update job status
 */
export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  traceId?: string
): Job | null {
  const job = jobStore.get(jobId);
  if (!job) {
    logError(traceId || jobId, "Attempted to update non-existent job", {
      jobId,
    });
    return null;
  }

  job.status = status;
  job.updatedAt = new Date();

  logInfo(traceId || job.traceId || jobId, "Job status updated", {
    jobId,
    status,
  });

  return job;
}

/**
 * Complete a job with result
 */
export function completeJob<T>(
  jobId: string,
  result: T,
  traceId?: string
): Job<T> | null {
  const job = jobStore.get(jobId);
  if (!job) {
    logError(traceId || jobId, "Attempted to complete non-existent job", {
      jobId,
    });
    return null;
  }

  job.status = "completed";
  job.result = result;
  job.updatedAt = new Date();

  logInfo(traceId || job.traceId || jobId, "Job completed successfully", {
    jobId,
  });

  return job as Job<T>;
}

/**
 * Fail a job with error
 */
export function failJob(
  jobId: string,
  error: ApiError,
  traceId?: string
): Job | null {
  const job = jobStore.get(jobId);
  if (!job) {
    logError(traceId || jobId, "Attempted to fail non-existent job", {
      jobId,
    });
    return null;
  }

  job.status = "failed";
  job.error = error;
  job.updatedAt = new Date();

  logError(traceId || job.traceId || jobId, "Job failed", {
    jobId,
    error,
  });

  return job;
}

/**
 * Delete a job
 */
export function deleteJob(jobId: string, traceId?: string): boolean {
  const existed = jobStore.delete(jobId);

  if (existed) {
    logInfo(traceId || jobId, "Job deleted", { jobId });
  }

  return existed;
}

/**
 * List all jobs (with optional status filter)
 */
export function listJobs(status?: JobStatus): Job[] {
  cleanupOldJobs();

  const jobs = Array.from(jobStore.values());

  if (status) {
    return jobs.filter((job) => job.status === status);
  }

  return jobs;
}

/**
 * Get job store statistics
 */
export function getJobStats(): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
} {
  const jobs = Array.from(jobStore.values());

  return {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };
}
