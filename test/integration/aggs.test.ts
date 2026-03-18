import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Aggregations Integration Tests', () => {
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

    await client.bulk({
      operations: [
        { index: { _index: 'products', _id: '1' } },
        { name: 'iPhone', category: 'smartphone', price: 1000 },
        { index: { _index: 'products', _id: '2' } },
        { name: 'Samsung', category: 'smartphone', price: 800 },
        { index: { _index: 'products', _id: '3' } },
        { name: 'MacBook', category: 'laptop', price: 2000 },
        { index: { _index: 'products', _id: '4' } },
        { name: 'Dell', category: 'laptop', price: 1500 },
      ],
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('should perform terms aggregation on category', async () => {
    const response = await client.search({
      index: 'products',
      query: { match_all: {} },
      aggs: {
        categories: {
          terms: { field: 'category' },
        },
      },
    });

    const aggs: any = response.aggregations;
    expect(aggs.categories.buckets).toEqual(
      expect.arrayContaining([
        { key: 'smartphone', doc_count: 2 },
        { key: 'laptop', doc_count: 2 },
      ]),
    );
  });

  it('should perform metric aggregations on price', async () => {
    const response = await client.search({
      index: 'products',
      query: { match_all: {} },
      aggs: {
        avg_price: { avg: { field: 'price' } },
        max_price: { max: { field: 'price' } },
        min_price: { min: { field: 'price' } },
        sum_price: { sum: { field: 'price' } },
      },
    });

    const aggs: any = response.aggregations;
    expect(aggs.avg_price.value).toBe(1325); // (1000+800+2000+1500) / 4
    expect(aggs.max_price.value).toBe(2000);
    expect(aggs.min_price.value).toBe(800);
    expect(aggs.sum_price.value).toBe(5300);
  });
});
