function getRequiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'NexusDeploy',
  apiUrl: getRequiredEnv('VITE_API_URL'),
};
