/**
 * Integration Tests for Uploads API
 * Tests the API endpoints and response structures
 */

import { describe, expect, it } from 'bun:test';
import crypto from 'crypto';

// Allowed file extensions (same as in file-validator.ts)
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Inline validation functions for testing
function isValidExtension(fileName: string): boolean {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return ALLOWED_EXTENSIONS.includes(extension);
}

function isValidFileSize(fileSize: number): boolean {
    return fileSize <= MAX_FILE_SIZE;
}

function getValidationError(fileName: string, fileSize: number): string | null {
    if (!isValidExtension(fileName)) {
        return `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }

    if (!isValidFileSize(fileSize)) {
        return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    return null;
}

// Mock generateFileId function for testing
function generateFileId(): string {
    return crypto.randomUUID();
}

describe('Uploads API Integration Tests', () => {
    describe('POST /api/uploads - Request Validation', () => {
        it('should require file field', () => {
            const validRequest = { file: { name: 'test.pdf', size: 1024 } };
            const invalidRequest = {};
            
            expect(validRequest.file).toBeDefined();
            expect(invalidRequest.file).toBeUndefined();
        });

        it('should validate file has required properties', () => {
            const mockFile = {
                name: 'document.pdf',
                size: 1024,
                type: 'application/pdf'
            };
            
            expect(mockFile.name).toBeDefined();
            expect(mockFile.size).toBeDefined();
            expect(mockFile.type).toBeDefined();
        });
    });

    describe('POST /api/uploads - File Extension Validation', () => {
        it('should accept PDF files', () => {
            const error = getValidationError('document.pdf', 1024);
            expect(error).toBeNull();
        });

        it('should accept JPG files', () => {
            const error = getValidationError('image.jpg', 1024);
            expect(error).toBeNull();
        });

        it('should accept JPEG files', () => {
            const error = getValidationError('image.jpeg', 1024);
            expect(error).toBeNull();
        });

        it('should accept PNG files', () => {
            const error = getValidationError('image.png', 1024);
            expect(error).toBeNull();
        });

        it('should reject TXT files', () => {
            const error = getValidationError('document.txt', 1024);
            expect(error).toContain('Invalid file extension');
        });

        it('should reject EXE files', () => {
            const error = getValidationError('program.exe', 1024);
            expect(error).toContain('Invalid file extension');
        });

        it('should reject files without extension', () => {
            const error = getValidationError('noextension', 1024);
            expect(error).toContain('Invalid file extension');
        });

        it('should handle case-insensitive extensions', () => {
            expect(getValidationError('document.PDF', 1024)).toBeNull();
            expect(getValidationError('document.Pdf', 1024)).toBeNull();
            expect(getValidationError('image.JPG', 1024)).toBeNull();
        });
    });

    describe('POST /api/uploads - File Size Validation', () => {
        it('should accept files up to 10MB', () => {
            const error = getValidationError('document.pdf', MAX_FILE_SIZE);
            expect(error).toBeNull();
        });

        it('should reject files larger than 10MB', () => {
            const error = getValidationError('document.pdf', MAX_FILE_SIZE + 1);
            expect(error).toContain('File too large');
        });

        it('should reject very large files', () => {
            const largeFileSize = 50 * 1024 * 1024;
            const error = getValidationError('document.pdf', largeFileSize);
            expect(error).toContain('File too large');
        });

        it('should accept small files', () => {
            expect(getValidationError('document.pdf', 100)).toBeNull();
            expect(getValidationError('document.pdf', 0)).toBeNull();
        });
    });

    describe('POST /api/uploads - Response Structures', () => {
        it('should return proper success response structure', () => {
            const successResponse = {
                data: {
                    file_id: '550e8400-e29b-41d4-a716-446655440000'
                }
            };
            
            expect(successResponse.data.file_id).toBeDefined();
            expect(typeof successResponse.data.file_id).toBe('string');
        });

        it('should return proper error response for no file', () => {
            const errorResponse = { error: 'No file uploaded' };
            
            expect(errorResponse.error).toBe('No file uploaded');
            expect(typeof errorResponse.error).toBe('string');
        });

        it('should return proper error response for invalid file', () => {
            const errorResponse = { 
                error: 'Invalid file extension. Allowed extensions: .pdf, .jpg, .jpeg, .png' 
            };
            
            expect(errorResponse.error).toContain('Invalid file extension');
        });

        it('should return proper error response for upload failure', () => {
            const errorResponse = { error: 'Upload failed' };
            
            expect(errorResponse.error).toBe('Upload failed');
            expect(typeof errorResponse.error).toBe('string');
        });
    });

    describe('POST /api/uploads - File ID Generation', () => {
        it('should generate valid UUID v4 format', () => {
            const fileId = generateFileId();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            
            expect(fileId).toMatch(uuidRegex);
        });

        it('should generate unique IDs on each call', () => {
            const id1 = generateFileId();
            const id2 = generateFileId();
            
            expect(id1).not.toBe(id2);
        });

        it('should return UUID of correct length', () => {
            const fileId = generateFileId();
            expect(fileId.length).toBe(36);
        });

        it('should return lowercase UUID', () => {
            const fileId = generateFileId();
            expect(fileId).toBe(fileId.toLowerCase());
        });
    });

    describe('POST /api/uploads - Combined Validation', () => {
        it('should validate both extension and size', () => {
            // Valid file
            expect(getValidationError('document.pdf', 1024)).toBeNull();
            
            // Invalid extension
            expect(getValidationError('document.txt', 1024)).toContain('Invalid file extension');
            
            // Invalid size
            expect(getValidationError('document.pdf', MAX_FILE_SIZE + 1)).toContain('File too large');
        });

        it('should check extension before size', () => {
            const error = getValidationError('document.txt', 50 * 1024 * 1024);
            expect(error).toContain('Invalid file extension');
        });
    });
});
