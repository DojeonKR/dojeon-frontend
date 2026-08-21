export const isUnauthorizedError = (error: unknown) =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'status' in error &&
      (error.status === 401 || error.status === 403),
  )
