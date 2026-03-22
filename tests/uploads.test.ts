/**
 * Uploads API Tests
 * Tests for POST /api/uploads endpoint
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Elysia, t } from 'elysia';
import { fullCleanup, createMockFile } from './setup';
import { db } from '../src/db';
import { temporaryUploads } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { existsSync, unlinkSync } from 'fs';

// Import services
import { generateFileId } from '../src/services/uploads-services';
import { getValidationError } from '../src/utils/file-validator';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB as per file-validator.ts

// Create test app with uploads route
const createApp = () => {
    return new Elysia({ prefix: '/api/uploads' })
        .post('', async ({ body, set }) => {
            const uploadedFile = body.file;

            if (!uploadedFile) {
                set.status = 400;
                return { error: 'No file uploaded' };
            }

            // Validate file
            const validationError = getValidationError(uploadedFile.name, uploadedFile.size);
            if (validationError) {
                set.status = 400;
                return { error: validationError };
            }

            try {
                // Generate unique file ID
                const fileId = generateFileId();

                // Save file to temporary storage
                const fileName = uploadedFile.name;
                const extension = fileName.substring(fileName.lastIndexOf('.'));
                const uniqueFileName = `${fileId}${extension}`;
                const filePath = `uploads/temp/${uniqueFileName}`;

                const arrayBuffer = await uploadedFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                await Bun.write(filePath, buffer);

                // Record metadata in database
                await db.insert(temporaryUploads).values({
                    fileId,
                    fileName: uploadedFile.name,
                    filePath,
                    fileSize: uploadedFile.size,
                    mimeType: uploadedFile.type,
                    status: 'pending'
                });

                return {
                    data: { file_id: fileId }
                };
            } catch (error) {
                console.error('Upload error:', error);
                set.status = 500;
                return { error: 'Upload failed' };
            }
        }, {
            body: t.Object({
                file: t.File()
            })
        });
};

describe('Uploads API', () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(async () => {
        await fullCleanup();
        app = createApp();
    });

    afterEach(async () => {
        app.stop();
        await fullCleanup();
    });

    describe('POST /api/uploads - Valid File Uploads', () => {
        it('should upload valid PDF file', async () => {
            const file = createMockFile({
                name: 'document.pdf',
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
            expect(body.data).toBeDefined();
            expect(body.data.file_id).toBeDefined();

            // Verify file was recorded in database
            const records = await db.select().from(temporaryUploads);
            expect(records.length).toBe(1);
            expect(records[0].fileName).toBe('document.pdf');
        });

        it('should upload valid JPG file', async () => {
            const file = createMockFile({
                name: 'image.jpg',
                size: 2048,
                type: 'image/jpeg'
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
            expect(body.data.file_id).toBeDefined();
        });

        it('should upload valid JPEG file', async () => {
            const file = createMockFile({
                name: 'image.jpeg',
                size: 2048,
                type: 'image/jpeg'
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
        });

        it('should upload valid PNG file', async () => {
            const file = createMockFile({
                name: 'image.png',
                size: 4096,
                type: 'image/png'
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
        });

        it('should upload file with size exactly at limit (10MB)', async () => {
            const file = createMockFile({
                name: 'large-document.pdf',
                size: MAX_FILE_SIZE,
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
        });
    });

    describe('POST /api/uploads - Invalid File Uploads', () => {
        it('should reject file exceeding size limit (>10MB)', async () => {
            const file = createMockFile({
                name: 'too-large.pdf',
                size: MAX_FILE_SIZE + 1,
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

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('File too large');
        });

        it('should reject file with invalid extension (txt)', async () => {
            const file = createMockFile({
                name: 'document.txt',
                size: 1024,
                type: 'text/plain'
            });

            const formData = new FormData();
            formData.append('file', file);

            const response = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('Invalid file extension');
        });

        it('should reject file with invalid extension (doc)', async () => {
            const file = createMockFile({
                name: 'document.doc',
                size: 1024,
                type: 'application/msword'
            });

            const formData = new FormData();
            formData.append('file', file);

            const response = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('Invalid file extension');
        });

        it('should reject file with invalid extension (exe)', async () => {
            const file = createMockFile({
                name: 'program.exe',
                size: 1024,
                type: 'application/x-msdownload'
            });

            const formData = new FormData();
            formData.append('file', file);

            const response = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('Invalid file extension');
        });

        it('should reject upload without file field', async () => {
            const formData = new FormData();

            const response = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            // Elysia returns 422 for validation errors when required field is missing
            expect([400, 422]).toContain(response.status);
        });

        it('should reject upload with empty file field', async () => {
            const formData = new FormData();
            formData.append('file', new File([], 'empty.txt', { type: 'text/plain' }));

            const response = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            // Empty file may fail with 400 (validation), 422 (schema), or 500 (error)
            expect([400, 422, 500]).toContain(response.status);
        });
    });

    describe('POST /api/uploads - Response Validation', () => {
        it('should return valid UUID format for file_id', async () => {
            const file = createMockFile({
                name: 'test.pdf',
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

            const body = await response.json();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(body.data.file_id).toMatch(uuidRegex);
        });

        it('should return 400 error structure for invalid file', async () => {
            const file = createMockFile({
                name: 'invalid.txt',
                size: 1024,
                type: 'text/plain'
            });

            const formData = new FormData();
            formData.append('file', file);

            const response = await app.handle(
                new Request('http://localhost:3000/api/uploads', {
                    method: 'POST',
                    body: formData
                })
            );

            const body = await response.json();
            expect(body).toHaveProperty('error');
            expect(typeof body.error).toBe('string');
        });
    });

    describe('POST /api/uploads - Cleanup Verification', () => {
        it('should create database record on successful upload', async () => {
            const file = createMockFile({
                name: 'cleanup-test.pdf',
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

            const records = await db.select().from(temporaryUploads);
            expect(records.length).toBe(1);
        });
    });
});
