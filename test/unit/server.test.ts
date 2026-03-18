import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/server.js';
import request from 'supertest';

describe('Server Unit Tests', () => {
  it('should have the correct ES headers', async () => {
    const app = createServer();
    const response = await request(app).get('/');
    expect(response.headers['x-elastic-product']).toBe('Elasticsearch');
  });

  it('should return cluster info', async () => {
    const app = createServer();
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.cluster_name).toBe('elastic-mock');
    expect(response.body.tagline).toBe('You Know, for Search');
  });
});
