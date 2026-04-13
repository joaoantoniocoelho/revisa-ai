import api from './api';

export interface CreditTier {
  maxPages: number;
  credits: number;
}

export interface CreditsConfig {
  creditTiers: CreditTier[];
  minCreditsPerGeneration: number;
  maxPdfPages: number;
}

let cachedConfig: CreditsConfig | null = null;

export interface CreditsEstimate {
  numPages: number;
  creditsRequired: number;
}

export async function fetchCreditsConfig(): Promise<CreditsConfig> {
  if (cachedConfig) return cachedConfig;
  const response = await api.get<CreditsConfig>('/credits/config');
  cachedConfig = response.data;
  return cachedConfig!;
}

export async function fetchCreditsEstimate(pdf: File): Promise<CreditsEstimate> {
  const formData = new FormData();
  formData.append('pdf', pdf);
  const response = await api.post<CreditsEstimate>('/credits/estimate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
