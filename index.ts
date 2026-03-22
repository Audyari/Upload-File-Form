import { Elysia } from 'elysia';
import { uploadsRoute } from './src/router/uploads-route';
import { entitiesRoute } from './src/router/entities-route';

const app = new Elysia()
    .use(uploadsRoute)
    .use(entitiesRoute)
    .listen(3000);

console.log(`🦊 Server is running at http://localhost:3000`);
