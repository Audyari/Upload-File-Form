/**
 * Unit Tests for Upload Services
 */

import { describe, expect, it, beforeEach, afterEach, mock, jest } from 'bun:test';
import { generateFileId } from '../../../src/services/uploads-services';

describe('Upload Services', () => {
    describe('generateFileId', () => {
        it('should generate a valid UUID v4 format', () => {
            const uuid = generateFileId();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(uuid).toMatch(uuidRegex);
        });

        it('should generate unique IDs on each call', () => {
            const id1 = generateFileId();
            const id2 = generateFileId();
            expect(id1).not.toBe(id2);
        });

        it('should return a string of correct length (36 characters for UUID)', () => {
            const uuid = generateFileId();
            expect(uuid.length).toBe(36);
        });

        it('should generate lowercase UUID', () => {
            const uuid = generateFileId();
            expect(uuid).toBe(uuid.toLowerCase());
        });
    });
});
