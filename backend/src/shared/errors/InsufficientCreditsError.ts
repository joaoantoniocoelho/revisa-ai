export class InsufficientCreditsError extends Error {
  constructor(
    message: string,
    public readonly creditsRequired: number,
    public readonly creditsAvailable: number
  ) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}
