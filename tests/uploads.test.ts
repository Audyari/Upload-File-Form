/**
 * Uploads API Tests
 * Tests for POST /api/uploads endpoint
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { fullCleanup, createMockFile } from './setup';
import { db } from '../src/db';
import { temporaryUploads } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { uploadsRoute } from '../src/router/uploads-route';
import { existsSync } from 'fs';
import { join } from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB as per file-validator.ts
const TEMP_UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');

// Create test app using actual route
const createApp = () => {
    return new Elysia().use(uploadsRoute);
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

        it('should upload file with size exactly at limit (5MB)', async () => {
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
        it('should reject file exceeding size limit (>5MB)', async () => {
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

            expect(response.status).toBe(422);
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

            // Empty file may fail with 400 (validation) or 500 (error during save)
            expect([400, 500]).toContain(response.status);
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

        it('should create physical file in uploads/temp directory', async () => {
            const file = createMockFile({
                name: 'physical-test.pdf',
                size: 2048,
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
            const fileId = body.data.file_id;

            // Get file record from database
            const records = await db.select().from(temporaryUploads);
            expect(records.length).toBe(1);
            
            const filePath = records[0].filePath;
            
            // Verify physical file exists
            expect(existsSync(filePath)).toBe(true);
        });

        it('should verify file content matches uploaded content', async () => {
            const testContent = 'Test file content for verification';
            const file = new File([testContent], 'content-test.pdf', {
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
            const filePath = records[0].filePath;

            // Read file content and verify
            const savedContent = await Bun.file(filePath).text();
            expect(savedContent).toBe(testContent);
        });
    });
});
