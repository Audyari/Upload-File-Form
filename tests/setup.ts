/**
 * Test Setup and Teardown Utilities
 * Handles database cleanup and test environment setup
 */

import { beforeEach, afterEach, mock } from 'bun:test';
import { db } from '../src/db';
import { temporaryUploads, entities } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { unlinkSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const TEMP_UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');
const PERMANENT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'permanent');
const TEST_DB_PATH = 'test.sqlite.db';

/**
 * Clean up all data from test database
 */
export async function cleanupDatabase(): Promise<void> {
    // Delete all entities (no foreign key constraints)
    await db.delete(entities);
    
    // Delete all temporary uploads
    await db.delete(temporaryUploads);
}

/**
 * Clean up all files from upload directories
 */
export function cleanupUploadDirectories(): void {
    // Clean temp directory
    if (existsSync(TEMP_UPLOAD_DIR)) {
        const tempFiles = readdirSync(TEMP_UPLOAD_DIR);
        tempFiles.forEach(file => {
            const filePath = join(TEMP_UPLOAD_DIR, file);
            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
        });
    }

    // Clean permanent directory
    if (existsSync(PERMANENT_UPLOAD_DIR)) {
        const permanentFiles = readdirSync(PERMANENT_UPLOAD_DIR);
        permanentFiles.forEach(file => {
            const filePath = join(PERMANENT_UPLOAD_DIR, file);
            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
        });
    }
}

/**
 * Full cleanup - database and files
 */
export async function fullCleanup(): Promise<void> {
    await cleanupDatabase();
    cleanupUploadDirectories();
}

/**
 * Create a mock file for testing
 */
export function createMockFile(options: {
    name: string;
    size: number;
    type: string;
    content?: string;
}): File {
    const { name, size, type, content } = options;
    const blobContent = content || 'x'.repeat(size);
    return new File([blobContent], name, { type });
}

/**
 * Setup test environment before each test
 */
export function setupTestEnvironment(): void {
    beforeEach(async () => {
        await fullCleanup();
    });
}

/**
 * Teardown test environment after each test
 */
export function teardownTestEnvironment(): void {
    afterEach(async () => {
        await fullCleanup();
    });
}

/**
 * Setup and teardown for test suite
 */
export function setupAndTeardown(): void {
    setupTestEnvironment();
    teardownTestEnvironment();
}
