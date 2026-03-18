import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Search Integration Tests', () => {
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
    await client.indices.create({
      index: 'products',
      mappings: {
        properties: {
          name: { type: 'text' },
          category: { type: 'keyword' },
          price: { type: 'double' },
        },
      },
    });

    await client.index({
      index: 'products',
      id: '1',
      document: { name: 'Apple iPhone 15', category: 'smartphone', price: 999 },
    });

    await client.index({
      index: 'products',
      id: '2',
      document: { name: 'Samsung Galaxy S24', category: 'smartphone', price: 899 },
    });

    await client.index({
      index: 'products',
      id: '3',
      document: { name: 'MacBook Pro', category: 'laptop', price: 1999 },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('should search with match_all', async () => {
    const response = await client.search({
      index: 'products',
      query: { match_all: {} },
    });

    expect(response.hits.total).toEqual({ value: 3, relation: 'eq' });
    expect(response.hits.hits.length).toBe(3);
  });

  it('should search with match (full-text)', async () => {
    const response = await client.search({
      index: 'products',
      query: {
        match: { name: 'iPhone' },
      },
    });

    expect(response.hits.total).toEqual({ value: 1, relation: 'eq' });
    expect(response.hits.hits[0]._id).toBe('1');
    expect((response.hits.hits[0]._source as any).name).toBe('Apple iPhone 15');
  });

  it('should search with term (exact filter)', async () => {
    const response = await client.search({
      index: 'products',
      query: {
        term: { category: 'laptop' },
      },
    });

    expect(response.hits.total).toEqual({ value: 1, relation: 'eq' });
    expect(response.hits.hits[0]._id).toBe('3');
  });

  it('should search with bool (must + must_not)', async () => {
    const response = await client.search({
      index: 'products',
      query: {
        bool: {
          must: [{ term: { category: 'smartphone' } }],
          must_not: [{ term: { price: 999 } }],
        },
      },
    });

    expect(response.hits.total).toEqual({ value: 1, relation: 'eq' });
    expect(response.hits.hits[0]._id).toBe('2'); // Samsung
  });
});
