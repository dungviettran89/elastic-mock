import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { createServer } from '../../src/server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Document CRUD Integration Tests', () => {
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

    // Setup: Create an index first
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

  it('3.1 should create a document with ID "1"', async () => {
    const response = await client.index({
      index: 'products',
      id: '1',
      document: {
        name: 'Widget A',
        price: 10.99,
        sku: 'W-A-001',
      },
    });

    expect(response._id).toBe('1');
    expect(response.result).toBe('created');
  });

  it('3.2 should get document by ID "1"', async () => {
    const response = await client.get({
      index: 'products',
      id: '1',
    });

    expect(response.found).toBe(true);
    expect(response._source).toEqual({
      name: 'Widget A',
      price: 10.99,
      sku: 'W-A-001',
    });
  });

  it('3.3 should update document "1"', async () => {
    const response = await client.update({
      index: 'products',
      id: '1',
      doc: {
        price: 12.5,
      },
    });

    expect(response.result).toBe('updated');

    const getResponse = await client.get({
      index: 'products',
      id: '1',
    });
    expect((getResponse._source as any).price).toBe(12.5);
    expect((getResponse._source as any).name).toBe('Widget A');
  });

  it('3.4 should delete document "1"', async () => {
    const response = await client.delete({
      index: 'products',
      id: '1',
    });

    expect(response.result).toBe('deleted');
    expect(response.found).toBe(true);
  });

  it('3.5 should return 404 for deleted document', async () => {
    try {
      await client.get({
        index: 'products',
        id: '1',
      });
      expect.fail('Should have thrown 404');
    } catch (error: any) {
      expect(error.meta.statusCode).toBe(404);
      expect(error.body.found).toBe(false);
    }
  });
});
