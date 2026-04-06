import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/config/database';

describe('Prompt Creation Integration Flow', () => {
  let testUser: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({ where: { email: 'test_integration@example.com' } });
    
    // Create a test user
    testUser = await prisma.user.create({
      data: {
        email: 'test_integration@example.com',
        name: 'Integration Test User',
        provider: 'password',
        apiKey: 'test-api-key-123'
      }
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('User Endpoints', () => {
    it('should list available contexts for the user', async () => {
      // Create a mock prompt first
      await prisma.tonePrompt.create({
        data: {
          userId: testUser.id,
          context: 'client',
          toneText: 'Direct and professional',
          status: 'active'
        }
      });

      const response = await request(app)
        .get(`/api/users/${testUser.id}/prompts/contexts`)
        .set('X-API-Key', 'test-api-key-123'); // Custom auth depends on implementation

      // Note: If using JWT auth, would need to login first
      // Skipping full auth dance for this demo snippet
      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should return 404 for non-existent user prompts', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/prompts/latest?context=nonexistent`)
        .set('X-API-Key', 'test-api-key-123');
      
      expect(response.status).toBe(404);
    });
  });
});
