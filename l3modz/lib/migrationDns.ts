import { setServers } from 'node:dns';
import { isIP } from 'node:net';

export function configureMigrationDns(value = process.env.MIGRATION_DNS_SERVERS) {
  if (value === undefined) return;

  const servers = value.split(',').map((server) => server.trim()).filter(Boolean);
  if (servers.length === 0 || servers.some((server) => isIP(server) === 0)) {
    throw new Error('MIGRATION_DNS_SERVERS must contain one or more comma-separated IP addresses');
  }

  setServers(servers);
}
