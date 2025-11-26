import { NextRequest } from "next/server";
import { ok, notFound } from "@/lib/core/api-response";
import { logInfo } from "@/lib/core/logger";
import { withOptionalAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import { getJob, deleteJob } from "@/lib/core/job-manager";

/**
 * GET /api/jobs/[id]
 *
 * Get job status and result
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     status: 'pending' | 'processing' | 'completed' | 'failed',
 *     createdAt: string,
 *     updatedAt: string,
 *     result?: any,
 *     error?: { code, message, detail? },
 *     traceId?: string
 *   },
 *   traceId: string
 * }
 */
const getHandler: BffRouteHandler = async (
  request: NextRequest,
  context
) => {
  const { traceId } = context;

  // Extract job ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const jobId = pathParts[pathParts.length - 1];

  logInfo(traceId, "Job status request", { jobId });

  const job = getJob(jobId);

  if (!job) {
    return notFound(`Job ${jobId} not found`, traceId);
  }

  return ok(
    {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      result: job.result,
      error: job.error,
      traceId: job.traceId,
    },
    traceId
  );
};

/**
 * DELETE /api/jobs/[id]
 *
 * Delete a job
 *
 * Response:
 * {
 *   success: true,
 *   data: { deleted: true },
 *   traceId: string
 * }
 */
const deleteHandler: BffRouteHandler = async (
  request: NextRequest,
  context
) => {
  const { traceId } = context;

  // Extract job ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const jobId = pathParts[pathParts.length - 1];

  logInfo(traceId, "Job delete request", { jobId });

  const deleted = deleteJob(jobId, traceId);

  if (!deleted) {
    return notFound(`Job ${jobId} not found`, traceId);
  }

  return ok({ deleted: true }, traceId);
};

export const GET = withOptionalAuth(getHandler);
export const DELETE = withOptionalAuth(deleteHandler);
