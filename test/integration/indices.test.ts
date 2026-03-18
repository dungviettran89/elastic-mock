import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Indices Lifecycle Integration Tests', () => {
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

  it('2.1 should create a new index "products"', async () => {
    const response = await client.indices.create({
      index: 'products',
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          name: { type: 'text' },
          price: { type: 'double' },
          sku: { type: 'keyword' },
        },
      },
    });

    expect(response.acknowledged).toBe(true);
    expect(response.shards_acknowledged).toBe(true);
    expect(response.index).toBe('products');
  });

  it('2.2 should verify index "products" existence', async () => {
    const exists = await client.indices.exists({
      index: 'products',
    });
    expect(exists).toBe(true);
  });

  it('2.3 should retrieve mapping for "products"', async () => {
    const response = await client.indices.getMapping({
      index: 'products',
    });

    expect(response.products.mappings).toEqual({
      properties: {
        name: { type: 'text' },
        price: { type: 'double' },
        sku: { type: 'keyword' },
      },
    });
  });

  it('should reflect index in cluster state', async () => {
    const state = await client.cluster.state({
      metric: 'metadata',
    });
    expect(state.metadata?.indices?.products).toBeDefined();
    expect(state.metadata?.indices?.products.mappings).toBeDefined();
  });
});
