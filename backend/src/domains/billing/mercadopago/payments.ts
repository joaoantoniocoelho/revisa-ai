import { mercadoPagoClient } from './client.js';

export interface CreatePixPaymentInput {
  /** Amount in cents (e.g. 1990 = R$ 19,90) */
  totalAmountCents: number;

  /** Sent to MP as external_reference (we use our DB paymentId) */
  externalReference?: string;

  /** UUID generated at checkout time and persisted in Payment.idempotencyKey */
  idempotencyKey: string;

  payerEmail: string;
  description: string;
}

export interface MpPixTransactionData {
  qr_code: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

export interface MpPixPointOfInteraction {
  type?: string;
  transaction_data?: MpPixTransactionData;
}

export interface MpPayment {
  id?: number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: MpPixPointOfInteraction;
  date_of_expiration?: string | null;
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<MpPayment> {
  const transactionAmount = Number((input.totalAmountCents / 100).toFixed(2));

  const payload: Record<string, unknown> = {
    transaction_amount: transactionAmount,
    payment_method_id: 'pix',
    description: input.description,
    payer: { email: input.payerEmail },
  };

  if (input.externalReference) payload.external_reference = input.externalReference;

  const { data } = await mercadoPagoClient.post<MpPayment>('/v1/payments', payload, {
    headers: {
      'X-Idempotency-Key': input.idempotencyKey,
    },
  });

  return data;
}

export async function getPayment(paymentId: string | number): Promise<MpPayment> {
  const { data } = await mercadoPagoClient.get<MpPayment>(`/v1/payments/${paymentId}`);
  return data;
}