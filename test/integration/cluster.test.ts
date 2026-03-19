import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Cluster Integration Tests', () => {
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

  it('1.1 Cluster Health should return green status', async () => {
    const health = await client.cluster.health();
    expect(health.cluster_name).toBe('elastic-mock');
    expect(health.status).toBe('green');
  });

  it('1.2 Cluster State Metadata should return empty indices', async () => {
    const state = await client.cluster.state({
      metric: 'metadata',
    });

    // In @elastic/elasticsearch 8.x, state returns a body with cluster_name, metadata, etc.
    expect(state.cluster_name).toBe('elastic-mock');
    expect(state.metadata).toBeDefined();
    expect(state.metadata?.indices).toEqual({});
  });
});
