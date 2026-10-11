import { loadEnvConfig } from '@next/env';

interface EnvironmentLike {
  NODE_ENV?: string;
  MONGODB_URI?: string;
}

export function loadRepositoryMigrationEnvironment(
  envDir: string,
  env: EnvironmentLike = process.env,
  useLocalEnv = false,
) {
  const inheritedUri = env.MONGODB_URI?.trim();
  if (!useLocalEnv) {
    if (inheritedUri) return;
    throw new Error('MONGODB_URI is not configured. Set it in the authorized runtime environment or pass --local-env for a read-only local dry-run.');
  }

  delete env.MONGODB_URI;
  try {
    loadEnvConfig(envDir, env.NODE_ENV === 'development', undefined, true);
  } catch (error) {
    if (inheritedUri) env.MONGODB_URI = inheritedUri;
    throw error;
  }

  const selectedValue = Reflect.get(env, 'MONGODB_URI');
  const selectedUri = typeof selectedValue === 'string' ? selectedValue.trim() : undefined;
  if (!selectedUri) {
    if (inheritedUri) env.MONGODB_URI = inheritedUri;
    throw new Error('Repository environment does not configure MONGODB_URI for local dry-run');
  }

  if (inheritedUri && inheritedUri !== selectedUri) {
    env.MONGODB_URI = inheritedUri;
    throw new Error('Inherited MONGODB_URI conflicts with --local-env. Remove the inherited variable before retrying the local dry-run.');
  }

  env.MONGODB_URI = inheritedUri || selectedUri;
}
