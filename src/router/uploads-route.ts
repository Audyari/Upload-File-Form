/**
 * Upload Router
 * Handles file upload endpoints
 */

import { Elysia, t } from 'elysia';
import { getValidationError } from '../utils/file-validator';
import { saveTemporaryFile, generateFileId } from '../services/uploads-services';

export const uploadsRoute = new Elysia({
    prefix: '/api/uploads',
    detail: {
        tags: ['Uploads'],
        description: 'File upload management endpoints'
    }
})
.post('', async ({ body }) => {
    const uploadedFile = body.file;
    
    if (!uploadedFile) {
        return {
            error: 'No file uploaded'
        };
    }
    
    // Validate file
    const validationError = getValidationError(uploadedFile.name, uploadedFile.size);
    if (validationError) {
        return {
            error: validationError
        };
    }
    
    try {
        // Generate unique file ID
        const fileId = generateFileId();
        
        // Save file to temporary storage
        await saveTemporaryFile(uploadedFile, fileId);
        
        return {
            data: {
                file_id: fileId
            }
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            error: 'Upload failed'
        };
    }
}, {
    body: t.Object({
        file: t.File({
            description: 'File to upload',
            examples: ['test.pdf']
        })
    }),
    detail: {
        summary: 'Upload a file to temporary storage',
        description: 'Uploads a file to temporary storage and returns a file_id for later use in form submission',
        responses: {
            200: {
                description: 'File uploaded successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'object',
                                    properties: {
                                        file_id: {
                                            type: 'string',
                                            example: '550e8400-e29b-41d4-a716-446655440000'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            400: {
                description: 'Invalid file or file size',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Invalid file extension. Allowed extensions: .pdf, .jpg, .jpeg, .png'
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});
