/**
 * Feature flags. A previsão só entra na navegação quando houver
 * funcionalidade validada: defina NEXT_PUBLIC_FEATURE_FORECAST=true.
 */
export const FEATURES = {
  forecast: process.env.NEXT_PUBLIC_FEATURE_FORECAST === "true",
} as const;
