import api from './api';

type Density = 'low' | 'medium' | 'high';

export interface CreditsConfig {
  creditsPerPageBase: number;
  densityMultipliers: Record<Density, number>;
  minCreditsPerGeneration: number;
  maxPdfPages: number;
}

let cachedConfig: CreditsConfig | null = null;

export interface CreditsEstimate {
  density: Density;
  numPages: number;
  creditsRequired: number;
}

export async function fetchCreditsConfig(): Promise<CreditsConfig> {
  if (cachedConfig) return cachedConfig;
  const response = await api.get<CreditsConfig>('/credits/config');
  cachedConfig = response.data;
  return cachedConfig!;
}

export async function fetchCreditsEstimate(
  pdf: File,
  density: Density
): Promise<CreditsEstimate> {
  const formData = new FormData();
  formData.append('pdf', pdf);
  formData.append('density', density);
  const response = await api.post<CreditsEstimate>('/credits/estimate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
