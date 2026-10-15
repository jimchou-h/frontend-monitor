export enum SpanStatus {
  Ok = 'ok',
  DeadlineExceeded = 'deadline_exceeded',
  Unauthenticated = 'unauthenticated',
  PermissionDenied = 'permission_denied',
  NotFound = 'not_found',
  ResourceExhausted = 'resource_exhausted',
  InvalidArgument = 'invalid_argument',
  Unimplemented = 'unimplemented',
  Unavailable = 'unavailable',
  InternalError = 'internal_error',
  UnknownError = 'unknown_error',
  Cancelled = 'cancelled',
  AlreadyExists = 'already_exists',
  FailedPrecondition = 'failed_precondition',
  Aborted = 'aborted',
  OutOfRange = 'out_of_range',
  DataLoss = 'data_loss',
}

export function fromHttpStatus(httpStatus: number): SpanStatus {
  if (httpStatus < 400) return SpanStatus.Ok;
  if (httpStatus >= 500) return SpanStatus.InternalError;
  switch (httpStatus) {
    case 400:
      return SpanStatus.InvalidArgument;
    case 401:
      return SpanStatus.Unauthenticated;
    case 403:
      return SpanStatus.PermissionDenied;
    case 404:
      return SpanStatus.NotFound;
    case 409:
      return SpanStatus.AlreadyExists;
    case 413:
      return SpanStatus.FailedPrecondition;
    case 429:
      return SpanStatus.ResourceExhausted;
    default:
      return SpanStatus.UnknownError;
  }
}
