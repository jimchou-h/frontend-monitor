export namespace Replace {
  export interface ITriggerConsole {
    args: any[];
    level: string;
  }

  export interface IRouter {
    from?: string;
    to?: string;
    isFail?: boolean;
    message?: string;
  }

  export interface IClick {
    target: string;
    time?: number;
  }
}
