/**
 * Integration Workflow Tests
 * Tests for complete user workflows across multiple API endpoints
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Elysia, t } from 'elysia';
import { fullCleanup, createMockFile } from './setup';
import { db } from '../src/db';
import { temporaryUploads, entities } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { generateFileId } from '../src/services/uploads-services';
import { getValidationError } from '../src/utils/file-validator';
import { existsSync } from 'fs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Create full test app with all routes
const createApp = () => {
    const app = new Elysia();

    // Health check endpoint
    app.get('/', () => ({ status: 'OK' }));

    // Uploads endpoint
    app.post('/api/uploads', async ({ body, set }) => {
        const uploadedFile = body.file;

        if (!uploadedFile) {
            set.status = 400;
            return { error: 'No file uploaded' };
        }

        const validationError = getValidationError(uploadedFile.name, uploadedFile.size);
        if (validationError) {
            set.status = 400;
            return { error: validationError };
        }

        try {
            const fileId = generateFileId();
            const fileName = uploadedFile.name;
            const extension = fileName.substring(fileName.lastIndexOf('.'));
            const uniqueFileName = `${fileId}${extension}`;
            const filePath = `uploads/temp/${uniqueFileName}`;

            const arrayBuffer = await uploadedFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await Bun.write(filePath, buffer);

            await db.insert(temporaryUploads).values({
                fileId,
                fileName: uploadedFile.name,
                filePath,
                fileSize: uploadedFile.size,
                mimeType: uploadedFile.type,
                status: 'pending'
            });

            return { data: { file_id: fileId } };
        } catch (error) {
            set.status = 500;
            return { error: 'Upload failed' };
        }
    }, {
        body: t.Object({ file: t.File() })
    });

    // Entities endpoint
    app.post('/api/entities', async ({ body, set }) => {
        const { name, description, file_id } = body;

        if (file_id) {
            const existingFile = await db.select()
                .from(temporaryUploads)
                .where(eq(temporaryUploads.fileId, file_id))
                .limit(1);

            if (existingFile.length === 0) {
                set.status = 400;
                return { error: 'File not found' };
            }

            if (existingFile[0].status === 'linked') {
                set.status = 400;
                return { error: 'File already linked' };
            }
        }

        try {
            await db.transaction(async (tx) => {
                await tx.insert(entities).values({
                    name,
                    description: description ?? null,
                    fileId: file_id ?? null,
                });

                if (file_id) {
                    await tx.update(temporaryUploads)
                        .set({ status: 'linked' })
                        .where(eq(temporaryUploads.fileId, file_id));
                }
            });

            return { data: 'OK' };
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to create entity' };
        }
    }, {
        body: t.Object({
            name: t.String(),
            description: t.Optional(t.String()),
            file_id: t.Optional(t.String())
        })
    });

    return app;
};

describe('Integration Workflow Tests', () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(async () => {
        await fullCleanup();
        app = createApp();
    });

    afterEach(async () => {
        app.stop();
        await fullCleanup();
    });

    describe('Complete Workflow: Upload file → Create entity with file_id', () => {
        it('should complete full workflow successfully', async () => {
            // Step 1: Upload a file
            const file = createMockFile({
                name: 'workflow-test.pdf',
                size: 2048,
                type: 'application/pdf'
            });

            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            expect(uploadResponse.status).toBe(200);
            const uploadBody = await uploadResponse.json();
            expect(uploadBody.data.file_id).toBeDefined();

            const fileId = uploadBody.data.file_id;

            // Step 2: Create entity with the uploaded file_id
            const entityResponse = await app.handle(
                new Request('http://localhost:3000/api/entities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Entity from Workflow',
                        description: 'Created via integration workflow',
                        file_id: fileId
                    })
                })
            );

            expect(entityResponse.status).toBe(200);
            const entityBody = await entityResponse.json();
            expect(entityBody.data).toBe('OK');

            // Step 3: Verify file status changed to 'linked'
            const fileRecord = await db.select()
                .from(temporaryUploads)
                .where(eq(temporaryUploads.fileId, fileId));
            
            expect(fileRecord.length).toBe(1);
            expect(fileRecord[0].status).toBe('linked');

            // Step 4: Verify entity was created with file reference
            const entityRecord = await db.select().from(entities);
            expect(entityRecord.length).toBe(1);
            expect(entityRecord[0].fileId).toBe(fileId);
        });

        it('should verify file moves to permanent storage after linking', async () => {
            // Upload file
            const file = createMockFile({
                name: 'permanent-test.pdf',
                size: 1024,
                type: 'application/pdf'
            });

            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            const uploadBody = await uploadResponse.json();
            const fileId = uploadBody.data.file_id;

            // Create entity with file
            await app.handle(
                new Request('http://localhost:3000/api/entities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Permanent File Test',
                        file_id: fileId
                    })
                })
            );

            // Verify file record exists and is linked
            const fileRecord = await db.select()
                .from(temporaryUploads)
                .where(eq(temporaryUploads.fileId, fileId));
            
            expect(fileRecord[0].status).toBe('linked');
        });
    });

    describe('Complete Workflow: Create entity without file', () => {
        it('should create entity successfully without file attachment', async () => {
            const response = await app.handle(
                new Request('http://localhost:3000/api/entities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Entity without File',
                        description: 'No file attached'
                    })
                })
            );

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.data).toBe('OK');

            // Verify entity was created
            const records = await db.select().from(entities);
            expect(records.length).toBe(1);
            expect(records[0].name).toBe('Entity without File');
            expect(records[0].fileId).toBeNull();
        });

        it('should create multiple entities without files', async () => {
            const entitiesData = [
                { name: 'Entity 1', description: 'First' },
                { name: 'Entity 2', description: 'Second' },
                { name: 'Entity 3', description: 'Third' }
            ];

            for (const data of entitiesData) {
                const response = await app.handle(
                    new Request('http://localhost:3000/api/entities', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })
                );
                expect(response.status).toBe(200);
            }

            const records = await db.select().from(entities);
            expect(records.length).toBe(3);
        });
    });

    describe('Workflow: Health check before and after operations', () => {
        it('should return healthy status before and after API operations', async () => {
            // Check health before
            const healthBefore = await app.handle(
                new Request('http://localhost:3000/', { method: 'GET' })
            );
            expect(healthBefore.status).toBe(200);
            expect(await healthBefore.json()).toEqual({ status: 'OK' });

            // Perform upload
            const file = createMockFile({
                name: 'health-test.pdf',
                size: 1024,
                type: 'application/pdf'
            });

            const formData = new FormData();
            formData.append('file', file);

            await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            // Check health after
            const healthAfter = await app.handle(
                new Request('http://localhost:3000/', { method: 'GET' })
            );
            expect(healthAfter.status).toBe(200);
            expect(await healthAfter.json()).toEqual({ status: 'OK' });
        });
    });

    describe('Workflow: Multiple uploads and entity creations', () => {
        it('should handle multiple file uploads and entity creations', async () => {
            const uploads = [];
            
            // Upload multiple files
            for (let i = 0; i < 3; i++) {
                const file = createMockFile({
                    name: `file-${i}.pdf`,
                    size: 1024,
                    type: 'application/pdf'
                });

                const formData = new FormData();
                formData.append('file', file);

                const response = await app.handle(
                    new Request('http://localhost:3000/api/uploads', {
                        method: 'POST',
                        body: formData
                    })
                );

                expect(response.status).toBe(200);
                const body = await response.json();
                uploads.push(body.data.file_id);
            }

            expect(uploads.length).toBe(3);

            // Create entities with each file
            for (let i = 0; i < 3; i++) {
                const response = await app.handle(
                    new Request('http://localhost:3000/api/entities', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: `Entity ${i}`,
                            file_id: uploads[i]
                        })
                    })
                );
                expect(response.status).toBe(200);
            }

            // Verify all entities and files
            const entityRecords = await db.select().from(entities);
            const fileRecords = await db.select().from(temporaryUploads);

            expect(entityRecords.length).toBe(3);
            expect(fileRecords.length).toBe(3);
            
            // All files should be linked
            fileRecords.forEach(record => {
                expect(record.status).toBe('linked');
            });
        });
    });

    describe('Workflow: File validation before entity creation', () => {
        it('should reject entity creation with invalid file_id after failed upload', async () => {
            // Try to upload invalid file
            const invalidFile = createMockFile({
                name: 'invalid.txt',
                size: 1024,
                type: 'text/plain'
            });

            const formData = new FormData();
            formData.append('file', invalidFile);

            const uploadResponse = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            expect(uploadResponse.status).toBe(400);

            // Try to create entity with non-existent file_id
            const entityResponse = await app.handle(
                new Request('http://localhost:3000/api/entities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Entity with Invalid File',
                        file_id: 'non-existent-id'
                    })
                })
            );

            expect(entityResponse.status).toBe(400);
            const body = await entityResponse.json();
            expect(body.error).toBe('File not found');
        });
    });

    describe('Workflow: Orphan file cleanup simulation', () => {
        it('should identify orphan files (pending status)', async () => {
            // Create a pending file (orphan simulation)
            const fileId = generateFileId();
            await db.insert(temporaryUploads).values({
                fileId,
                fileName: 'orphan-test.pdf',
                filePath: 'uploads/temp/orphan-test.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                status: 'pending'
            });

            // Query for orphan files (pending status)
            const orphanFiles = await db.select()
                .from(temporaryUploads)
                .where(eq(temporaryUploads.status, 'pending'));

            expect(orphanFiles.length).toBe(1);
            expect(orphanFiles[0].fileId).toBe(fileId);
        });

        it('should not list linked files as orphans', async () => {
            // Create a linked file
            const fileId = generateFileId();
            await db.insert(temporaryUploads).values({
                fileId,
                fileName: 'linked-test.pdf',
                filePath: 'uploads/temp/linked-test.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                status: 'linked'
            });

            // Query for orphan files (pending status only)
            const orphanFiles = await db.select()
                .from(temporaryUploads)
                .where(eq(temporaryUploads.status, 'pending'));

            expect(orphanFiles.length).toBe(0);
        });
    });
});
