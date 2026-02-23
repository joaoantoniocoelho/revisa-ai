import api from './api';

export interface Package {
  _id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  priceCents: number;
  active: boolean;
  sortOrder: number;
}

export interface CheckoutResult {
  checkoutId: string;
  paymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

export async function fetchPackages(): Promise<Package[]> {
  const response = await api.get<{ packages: Package[] }>('/billing/packages');
  return response.data.packages;
}

export async function checkout(
  packageCode: string,
  checkoutId?: string
): Promise<CheckoutResult> {
  const response = await api.post<CheckoutResult>('/billing/checkout', {
    packageCode,
    checkoutId,
  });
  return response.data;
}

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100);
}
