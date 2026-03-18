import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Bulk and CAT Integration Tests', () => {
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

    // Setup: Create an index
    await client.indices.create({
      index: 'products',
      mappings: {
        properties: {
          name: { type: 'text' },
          price: { type: 'double' },
          sku: { type: 'keyword' },
        },
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('4.1 should bulk load documents', async () => {
    const response = await client.bulk({
      operations: [
        { index: { _index: 'products', _id: '1' } },
        { name: 'Widget A', price: 10.99, sku: 'W-A-001' },
        { index: { _index: 'products', _id: '2' } },
        { name: 'Widget B', price: 15.5, sku: 'W-B-002' },
        { index: { _index: 'products', _id: '3' } },
        { name: 'Widget C', price: 20.0, sku: 'W-C-003' },
      ],
    });

    expect(response.errors).toBe(false);
    expect(response.items.length).toBe(3);
  });

  it('4.2 should verify indices via _cat/indices', async () => {
    const response = await client.cat.indices({
      index: 'products',
      v: true,
      h: ['index', 'docs.count'],
    });

    // @elastic/elasticsearch returns cat response as text by default
    expect(typeof response).toBe('string');
    expect(response).toContain('products');
    expect(response).toContain('3');
  });

  it('4.3 should verify document count via _cat/count', async () => {
    const response = await client.cat.count({
      index: 'products',
      v: true,
    });

    expect(typeof response).toBe('string');
    expect(response).toContain('3');
  });

  it('4.4 should check health via _cat/health', async () => {
    const response = await client.cat.health({
      v: true,
    });

    expect(typeof response).toBe('string');
    expect(response).toContain('green');
    expect(response).toContain('elastic-mock');
  });

  it('should support JSON format for _cat APIs', async () => {
    // Note: The client might not support format: 'json' easily through the cat helper
    // without some extra work, so we'll just test if the server handles it.
    // We can use the transport.request directly.
    const response = await client.transport.request({
      method: 'GET',
      path: '/_cat/indices',
      querystring: { format: 'json' },
    });

    expect(Array.isArray(response)).toBe(true);
    expect((response as any)[0].index).toBe('products');
    expect((response as any)[0]['docs.count']).toBe(3);
  });
});
