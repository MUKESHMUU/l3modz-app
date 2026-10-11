import { loadEnvConfig } from '@next/env';
import { loadRepositoryMigrationEnvironment } from '@/lib/migrationEnv';

jest.mock('@next/env', () => ({
  loadEnvConfig: jest.fn(),
}));

describe('loadRepositoryMigrationEnvironment', () => {
  const loadEnvConfigMock = jest.mocked(loadEnvConfig);

  beforeEach(() => {
    loadEnvConfigMock.mockReset();
  });

  it('preserves an explicitly supplied remote URI without loading local env', () => {
    const env = { NODE_ENV: 'development', MONGODB_URI: 'mongodb+srv://user:secret@atlas.example/l3modz' };

    loadRepositoryMigrationEnvironment('repository', env);

    expect(env.MONGODB_URI).toBe('mongodb+srv://user:secret@atlas.example/l3modz');
    expect(loadEnvConfigMock).not.toHaveBeenCalled();
  });

  it('loads the repository environment for explicit local selection', () => {
    const env = { NODE_ENV: 'development', MONGODB_URI: undefined as string | undefined };
    loadEnvConfigMock.mockImplementation((_dir, _dev, _log, _force) => {
      env.MONGODB_URI = 'mongodb://localhost:27017/l3modz';
      return {} as never;
    });

    loadRepositoryMigrationEnvironment('repository', env, true);

    expect(env.MONGODB_URI).toBe('mongodb://localhost:27017/l3modz');
    expect(loadEnvConfigMock).toHaveBeenCalledWith('repository', true, undefined, true);
  });

  it('fails before connection when local selection conflicts with an inherited URI', () => {
    const inheritedUri = 'mongodb+srv://user:secret@atlas.example/l3modz';
    const env = { NODE_ENV: 'development', MONGODB_URI: inheritedUri };
    loadEnvConfigMock.mockImplementation((_dir, _dev, _log, _force) => {
      env.MONGODB_URI = 'mongodb://localhost:27017/l3modz';
      return {} as never;
    });

    expect(() => loadRepositoryMigrationEnvironment('repository', env, true)).toThrow(
      'Inherited MONGODB_URI conflicts with --local-env',
    );
    expect(env.MONGODB_URI).toBe(inheritedUri);
  });
});
