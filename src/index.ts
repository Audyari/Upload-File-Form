import { Elysia } from 'elysia';
import { uploadsRoute } from './router/uploads-route';
import { entitiesRoute } from './router/entities-route';

const app = new Elysia()
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
    })
    .use(uploadsRoute)
    .use(entitiesRoute)
    .listen(3000);

console.log(`🦊 Server is running at http://localhost:3000`);
