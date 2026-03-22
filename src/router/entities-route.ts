/**
 * Entity Router
 * Handles entity form submission endpoints
 */

import { Elysia, t } from 'elysia';
import { createEntity, validateFileExists, linkFileToFileId } from '../services/entities-services';

export const entitiesRoute = new Elysia({
    prefix: '/api/entities',
    detail: {
        tags: ['Entities'],
        description: 'Entity form submission endpoints'
    }
})
.post('', async ({ body }) => {
    const { name, description, file_id } = body;
    
    // Validate file_id if provided
    if (file_id) {
        const fileExists = await validateFileExists(file_id);
        if (!fileExists) {
            return {
                error: 'File not found'
            };
        }
    }
    
    try {
        // Create entity
        const entity = await createEntity(name, description ?? null, file_id ?? null);
        
        // Link file if provided
        if (file_id) {
            await linkFileToFileId(file_id);
        }
        
        return {
            data: 'OK'
        };
    } catch (error) {
        console.error('Create entity error:', error);
        return {
            error: 'Failed to create entity'
        };
    }
}, {
    body: t.Object({
        name: t.String({
            description: 'Entity name',
            examples: ['My Entity']
        }),
        description: t.Optional(t.String({
            description: 'Entity description',
            examples: ['This is a description']
        })),
        file_id: t.Optional(t.String({
            description: 'File ID from previous upload',
            examples: ['550e8400-e29b-41d4-a716-446655440000']
        }))
    }),
    detail: {
        summary: 'Create a new entity',
        description: 'Creates a new entity with optional file reference. If file_id is provided, it must exist from a previous upload.',
        responses: {
            200: {
                description: 'Entity created successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'string',
                                    example: 'OK'
                                }
                            }
                        }
                    }
                }
            },
            400: {
                description: 'Invalid file_id or missing required fields',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'File not found'
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});
