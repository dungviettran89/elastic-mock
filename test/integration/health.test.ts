import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Elasticsearch Mock Health API', () => {
  let server: Server;
  let client: Client;
  let port: number;

  beforeAll(async () => {
    const app = createServer();
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    port = (server.address() as AddressInfo).port;

    client = new Client({
      node: `http://localhost:${port}`,
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('should return cluster info for GET /', async () => {
    const info = await client.info();
    expect(info.name).toBe('elastic-mock');
    expect(info.cluster_name).toBe('elastic-mock');
    expect(info.tagline).toBe('You Know, for Search');
  });

  it('should return cluster health for GET /_cluster/health', async () => {
    const health = await client.cluster.health();
    expect(health.cluster_name).toBe('elasticsearch');
    expect(health.status).toBe('green');
  });
});
