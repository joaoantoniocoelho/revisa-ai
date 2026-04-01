import api from './api';

export interface CreditPackage {
  id: 'starter' | 'pro' | 'max';
  credits: number;
  amountBrl: number;
  label: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface PaymentStatus {
  status: 'pending' | 'credited' | 'failed';
}

export async function fetchCreditPackages(): Promise<CreditPackage[]> {
  const { data } = await api.get<{ packages: CreditPackage[] }>('/payments/packages');
  return data.packages;
}

export async function createCheckoutSession(packageId: string): Promise<CheckoutSessionResult> {
  const { data } = await api.post<CheckoutSessionResult>('/payments/session', { packageId });
  return data;
}

export async function pollPaymentStatus(sessionId: string): Promise<PaymentStatus> {
  const { data } = await api.get<PaymentStatus>(`/payments/${sessionId}/status`);
  return data;
}
