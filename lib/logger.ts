/**
 * Structured logs for the server, written as one JSON object per line so the
 * hosting platform's log search can filter on fields (`level`, `route`, `code`)
 * instead of grepping prose.
 *
 * What is logged is chosen with the people in the data in mind. A log line lives
 * longer and travels further than a database row, and nobody can ask for it to
 * be deleted, so it carries where and what went wrong, never who or with what:
 *
 * - No headers, cookies, request bodies or query strings.
 * - Prisma error messages are not logged at all. They embed the failing call,
 *   and for a validation error that includes the values that were sent. The
 *   error's name, code and the model it concerns say what happened.
 * - Any other message has emails, tokens and database addresses blanked out.
 *
 * It uses nothing but `console`, so it runs in every runtime Next.js has.
 */

type Level = "info" | "warn" | "error";

export type LogContext = Record<string, string | number | boolean | undefined>;

const MAX_MESSAGE_LENGTH = 300;
const MAX_STACK_FRAMES = 6;

/** Blanks out what must not end up in a log line, then caps the length. */
export function scrub(text: string): string {
  return text
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[database-url]")
    .replace(/\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/g, "[token]")
    .replace(/\b(?:ya29|1\/\/)[\w./-]{12,}/g, "[token]")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .slice(0, MAX_MESSAGE_LENGTH);
}

type PrismaLike = {
  name: string;
  code: string;
  meta?: { modelName?: unknown };
};

/** Prisma's known errors carry a code (P2002, ...); their message is not safe. */
function asPrismaError(error: unknown): PrismaLike | null {
  if (!(error instanceof Error)) return null;
  const candidate = error as Error & {
    code?: unknown;
    clientVersion?: unknown;
  };
  const isPrisma =
    typeof candidate.clientVersion === "string" ||
    candidate.name.startsWith("PrismaClient");
  return isPrisma
    ? {
        name: candidate.name,
        code: typeof candidate.code === "string" ? candidate.code : "unknown",
        meta: (candidate as { meta?: PrismaLike["meta"] }).meta,
      }
    : null;
}

/**
 * The few stack frames nearest the failure; the rest is framework plumbing.
 *
 * Only lines that are frames ("    at ...") are kept. A stack begins with the
 * error's message, and a Prisma message runs over several lines, so cutting by
 * line count would carry the rest of it, values included, into the log.
 */
function topOfStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  const frames = stack
    .split("\n")
    .filter((line) => /^\s+at\s/.test(line))
    .slice(0, MAX_STACK_FRAMES)
    .map((line) => scrub(line.trim()));
  return frames.length > 0 ? frames.join("\n") : undefined;
}

export function describeError(error: unknown): Record<string, unknown> {
  const prisma = asPrismaError(error);
  if (prisma) {
    const model = prisma.meta?.modelName;
    return {
      name: prisma.name,
      code: prisma.code,
      ...(typeof model === "string" ? { model } : {}),
      // No message: see the note at the top of this file.
      stack: topOfStack((error as Error).stack),
    };
  }

  if (error instanceof Error) {
    const digest = (error as Error & { digest?: unknown }).digest;
    return {
      name: error.name,
      message: scrub(error.message),
      ...(typeof digest === "string" ? { digest } : {}),
      stack: topOfStack(error.stack),
    };
  }

  // A thrown string or object: say what kind of thing it was, not what it held.
  return { name: "NonError", message: typeof error };
}

function write(level: Level, message: string, fields: Record<string, unknown>) {
  // Logging must never be the thing that takes a request down. A context that
  // cannot be serialised (a circular object) is replaced by a note saying so.
  let line: string;
  try {
    line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      msg: message,
      ...fields,
    });
  } catch {
    line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      msg: message,
      logError: "fields could not be serialised",
    });
  }
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logError(
  message: string,
  error: unknown,
  context: LogContext = {},
): void {
  write("error", message, { ...context, error: describeError(error) });
}

export function logWarn(message: string, context: LogContext = {}): void {
  write("warn", message, context);
}

/** The path without its query string, which can carry what a person typed. */
export function pathOnly(path: string): string {
  const end = path.search(/[?#]/);
  return end === -1 ? path : path.slice(0, end);
}
