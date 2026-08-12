const fallbackApiBaseUrl = 'http://localhost:4000/api/v1';

export const appEnv = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseUrl).replace(/\/$/, ''),
};
