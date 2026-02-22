export class BillingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

export class PackageNotFoundError extends BillingError {
  constructor() {
    super('Package not found or inactive', 404);
    this.name = 'PackageNotFoundError';
  }
}

export class GatewayError extends BillingError {
  constructor(message = 'Payment gateway error. Please try again.') {
    super(message, 502);
    this.name = 'GatewayError';
  }
}
