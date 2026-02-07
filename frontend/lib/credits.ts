import api from './api';

export interface CreditsConfig {
  creditsPerPage: number;
  minCreditsPerGeneration: number;
}

let cachedConfig: CreditsConfig | null = null;

export async function fetchCreditsConfig(): Promise<CreditsConfig> {
  if (cachedConfig) return cachedConfig;
  const response = await api.get<CreditsConfig>('/credits/config');
  cachedConfig = response.data;
  return cachedConfig!;
}
