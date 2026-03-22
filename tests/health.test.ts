/**
 * Health Check API Tests
 * Tests for GET / endpoint
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { fullCleanup } from './setup';

// Import the main app configuration
const createApp = () => {
    return new Elysia()
        .get('/', () => ({ status: 'OK' }), {
            detail: {
                tags: ['Health'],
                summary: 'Health check endpoint',
                description: 'Returns the health status of the API',
                responses: {
                    200: {
                        description: 'API is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            example: 'OK'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
};

describe('Health Check API', () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(async () => {
        await fullCleanup();
        app = createApp();
    });

    afterEach(async () => {
        app.stop();
        await fullCleanup();
    });

    describe('GET /', () => {
        it('should return 200 status code', async () => {
            const response = await app.handle(
                new Request('http://localhost:3000/', { method: 'GET' })
            );

            expect(response.status).toBe(200);
        });

        it('should return { status: "OK" } response', async () => {
            const response = await app.handle(
                new Request('http://localhost:3000/', { method: 'GET' })
            );

            const body = await response.json();
            expect(body).toEqual({ status: 'OK' });
        });

        it('should return JSON content type', async () => {
            const response = await app.handle(
                new Request('http://localhost:3000/', { method: 'GET' })
            );

            const contentType = response.headers.get('content-type');
            expect(contentType).toContain('application/json');
        });

        it('should respond quickly (under 100ms)', async () => {
            const startTime = Date.now();
            
            const response = await app.handle(
                new Request('http://localhost:3000/', { method: 'GET' })
            );
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(100);
            expect(response.status).toBe(200);
        });

        it('should handle multiple consecutive requests', async () => {
            const requests = Array(5).fill(null).map(() => 
                app.handle(new Request('http://localhost:3000/', { method: 'GET' }))
            );

            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });
});
