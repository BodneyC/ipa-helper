/**
 * A success-or-failure value. The domain returns `Result` for expected failures
 * (bad URL fragment, unknown pasted characters) instead of throwing.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Wraps a success value. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Wraps a failure value. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Applies `f` to a success value and passes failures through unchanged. */
export const mapResult = <T, U, E>(result: Result<T, E>, f: (value: T) => U): Result<U, E> =>
  result.ok ? ok(f(result.value)) : result;

/**
 * Marks code that is unreachable when a `switch` over a discriminated union is
 * exhaustive. Call it in the `default` branch.
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
};
