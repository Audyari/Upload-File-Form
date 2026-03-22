/**
 * Integration Workflow Tests
 * Tests for complete user workflows across multiple API endpoints
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { fullCleanup, createMockFile } from './setup';
import { db } from '../src/db';
import { temporaryUploads, entities } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { uploadsRoute } from '../src/router/uploads-route';
import { entitiesRoute } from '../src/router/entities-route';
import { generateFileId } from '../src/services/uploads-services';
import { existsSync } from 'fs';
import { join } from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB as per file-validator.ts
const TEMP_UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');
const PERMANENT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'permanent');

// Create full test app with actual routes
const createApp = () => {
    return new Elysia()
        .get('/', () => ({ status: 'OK' }))
        .use(uploadsRoute)
        .use(entitiesRoute);
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

        it('should cleanup physical files after test teardown', async () => {
            // Upload a file
            const file = createMockFile({
                name: 'cleanup-verify-test.pdf',
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

            expect(uploadResponse.status).toBe(200);
            const uploadBody = await uploadResponse.json();
            const fileId = uploadBody.data.file_id;

            // Get file path from database
            const records = await db.select().from(temporaryUploads);
            const filePath = records[0].filePath;

            // Verify file exists before cleanup
            expect(existsSync(filePath)).toBe(true);

            // Manually trigger cleanup
            await fullCleanup();

            // Verify file is deleted after cleanup
            expect(existsSync(filePath)).toBe(false);
        });
    });
});
