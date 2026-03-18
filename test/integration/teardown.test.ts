import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Teardown Integration Tests', () => {
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

    // Setup: Create an index and add some documents
    await client.indices.create({ index: 'teardown-test' });
    await client.index({
      index: 'teardown-test',
      document: { foo: 'bar' },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('5.1 should delete index and verify it is gone', async () => {
    const delResponse = await client.indices.delete({
      index: 'teardown-test',
    });
    expect(delResponse.acknowledged).toBe(true);

    const exists = await client.indices.exists({
      index: 'teardown-test',
    });
    expect(exists).toBe(false);
  });

  it('5.2 should have no indices in _cat/indices', async () => {
    const response = await client.cat.indices({
      format: 'json',
    });
    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBe(0);
  });

  it('5.3 should have 0 count in _cat/count', async () => {
    const response = await client.cat.count({
      format: 'json',
    });
    expect((response as any)[0].count).toBe(0);
  });

  it('5.4 should support mock cluster settings', async () => {
    const putResponse = await client.cluster.putSettings({
      body: {
        persistent: {
          'indices.recovery.max_bytes_per_sec': '50mb',
        },
      },
    });
    expect(putResponse.acknowledged).toBe(true);

    const getResponse = await client.cluster.getSettings();
    expect(getResponse.persistent).toBeDefined();
  });
});
