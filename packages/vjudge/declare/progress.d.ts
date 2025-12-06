declare module "progress" {
  class ProgressBar {
    constructor(format: string, options: any);
    tick(len?: number, tokens?: any): void;
    update(ratio: number, tokens?: any): void;
    interrupt(message: string): void;
    terminate(): void;
    total: number;
    curr: number;
    complete: boolean;
  }
  export = ProgressBar;
}