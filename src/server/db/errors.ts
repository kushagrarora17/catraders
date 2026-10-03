/** True if `error` (or a wrapped cause) is a Postgres unique violation on `constraint`. */
export function isUniqueViolation(error: unknown, constraint: string) {
  // Drizzle wraps driver errors; the pg error may be the error itself or its cause.
  for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) {
    const pgError = e as { code?: string; constraint?: string };
    if (pgError.code === "23505" && pgError.constraint === constraint) return true;
  }
  return false;
}
