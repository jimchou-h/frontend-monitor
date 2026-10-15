export enum Severity {
  Else = 'else',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Debug = 'debug',
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical',
}

export namespace Severity {
  export function fromString(level: string): Severity {
    switch (String(level).toLowerCase()) {
      case Severity.Error:
        return Severity.Error;
      case Severity.Exception:
      case Severity.Critical:
        return Severity.Critical;
      case Severity.Warning:
        return Severity.Warning;
      case Severity.Info:
        return Severity.Info;
      case Severity.Debug:
        return Severity.Debug;
      case Severity.Low:
        return Severity.Low;
      case Severity.Normal:
        return Severity.Normal;
      case Severity.High:
        return Severity.High;
      default:
        return Severity.Else;
    }
  }

  export const Exception = 'exception';
}
