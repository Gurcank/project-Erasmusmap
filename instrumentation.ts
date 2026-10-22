import type { Instrumentation } from "next";
import { logError, pathOnly } from "@/lib/logger";

/**
 * Next.js calls this for every error it catches on the server: a page that
 * threw while rendering, a route handler, a server action. Without it such an
 * error reaches the person as the generic error page and the operator not at all
 * unless they happen to be tailing the log.
 *
 * It reports where and what, through the logger, which keeps people's data out
 * of the line (see lib/logger.ts). The request's headers are deliberately never
 * read: they hold cookies.
 */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logError("Request failed", error, {
    method: request.method,
    path: pathOnly(request.path),
    route: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
};
