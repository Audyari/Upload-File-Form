/**
 * Unit Tests for File Validator Utility
 */

import { describe, expect, it } from 'bun:test';
import { isValidExtension, isValidFileSize, getValidationError } from '../../../src/utils/file-validator';

describe('File Validator Utils', () => {
    describe('isValidExtension', () => {
        it('should return true for valid PDF extension', () => {
            expect(isValidExtension('document.pdf')).toBe(true);
        });

        it('should return true for valid JPG extension', () => {
            expect(isValidExtension('image.jpg')).toBe(true);
        });

        it('should return true for valid JPEG extension', () => {
            expect(isValidExtension('image.jpeg')).toBe(true);
        });

        it('should return true for valid PNG extension', () => {
            expect(isValidExtension('image.png')).toBe(true);
        });

        it('should return true for uppercase extensions', () => {
            expect(isValidExtension('document.PDF')).toBe(true);
            expect(isValidExtension('image.JPG')).toBe(true);
        });

        it('should return true for mixed case extensions', () => {
            expect(isValidExtension('document.Pdf')).toBe(true);
            expect(isValidExtension('image.Jpg')).toBe(true);
        });

        it('should return false for invalid extension', () => {
            expect(isValidExtension('document.txt')).toBe(false);
        });

        it('should return false for executable files', () => {
            expect(isValidExtension('script.exe')).toBe(false);
            expect(isValidExtension('program.bat')).toBe(false);
        });

        it('should return false for files without extension', () => {
            expect(isValidExtension('noextension')).toBe(false);
        });

        it('should return false for empty filename', () => {
            expect(isValidExtension('')).toBe(false);
        });
    });

    describe('isValidFileSize', () => {
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

        it('should return true for file size equal to max', () => {
            expect(isValidFileSize(MAX_FILE_SIZE)).toBe(true);
        });

        it('should return true for file size less than max', () => {
            expect(isValidFileSize(MAX_FILE_SIZE - 1)).toBe(true);
            expect(isValidFileSize(1024)).toBe(true);
        });

        it('should return true for small files', () => {
            expect(isValidFileSize(100)).toBe(true);
            expect(isValidFileSize(0)).toBe(true);
        });

        it('should return false for file size greater than max', () => {
            expect(isValidFileSize(MAX_FILE_SIZE + 1)).toBe(false);
        });

        it('should return false for very large files', () => {
            const largeFile = 50 * 1024 * 1024; // 50MB
            expect(isValidFileSize(largeFile)).toBe(false);
        });
    });

    describe('getValidationError', () => {
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

        it('should return null for valid file', () => {
            expect(getValidationError('document.pdf', 1024)).toBeNull();
        });

        it('should return null for valid file with max size', () => {
            expect(getValidationError('document.pdf', MAX_FILE_SIZE)).toBeNull();
        });

        it('should return error for invalid extension', () => {
            const error = getValidationError('document.txt', 1024);
            expect(error).toContain('Invalid file extension');
            expect(error).toContain('.pdf, .jpg, .jpeg, .png');
        });

        it('should return error for file too large', () => {
            const error = getValidationError('document.pdf', MAX_FILE_SIZE + 1);
            expect(error).toContain('File too large');
            expect(error).toContain('10MB');
        });

        it('should return error for both invalid extension and size', () => {
            const error = getValidationError('document.txt', MAX_FILE_SIZE + 1);
            // Extension is checked first
            expect(error).toContain('Invalid file extension');
        });
    });
});
