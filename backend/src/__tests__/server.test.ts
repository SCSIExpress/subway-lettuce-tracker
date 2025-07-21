import request from 'supertest';
import express from 'express';

// Simple test app for testing
const app = express();
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

describe('Server Health Check', () => {
  it('should return OK status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
  });
});