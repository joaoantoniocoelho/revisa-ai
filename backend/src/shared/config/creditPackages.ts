export const CREDIT_PACKAGES = {
  starter: { id: 'starter', credits: 10, amountBrl: 490, label: 'Starter' },
  pro: { id: 'pro', credits: 30, amountBrl: 1290, label: 'Pro' },
  max: { id: 'max', credits: 80, amountBrl: 2990, label: 'Max' },
} as const;

export type PackageId = keyof typeof CREDIT_PACKAGES;
export type CreditPackage = (typeof CREDIT_PACKAGES)[PackageId];
