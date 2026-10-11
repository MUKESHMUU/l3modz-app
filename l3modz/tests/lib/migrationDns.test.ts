import { setServers } from 'node:dns';
import { configureMigrationDns } from '@/lib/migrationDns';

jest.mock('node:dns', () => ({
  setServers: jest.fn(),
}));

describe('configureMigrationDns', () => {
  const setServersMock = jest.mocked(setServers);

  beforeEach(() => {
    setServersMock.mockReset();
  });

  it('does not change DNS servers when the setting is omitted', () => {
    configureMigrationDns(undefined);
    expect(setServersMock).not.toHaveBeenCalled();
  });

  it('configures validated IPv4 servers', () => {
    configureMigrationDns('8.8.8.8, 8.8.4.4');
    expect(setServersMock).toHaveBeenCalledWith(['8.8.8.8', '8.8.4.4']);
  });

  it('rejects invalid DNS server values', () => {
    expect(() => configureMigrationDns('8.8.8.8,not-a-server')).toThrow(
      'MIGRATION_DNS_SERVERS must contain one or more comma-separated IP addresses',
    );
    expect(setServersMock).not.toHaveBeenCalled();
  });
});
