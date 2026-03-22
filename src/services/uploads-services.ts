/**
 * Upload Services
 * Handles business logic for file uploads
 */

import { db } from '../db';
import { temporaryUploads } from '../db/schema';
import { eq, lt, and, sql } from 'drizzle-orm';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';
import crypto from 'crypto';

const TEMP_UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');
const PERMANENT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'permanent');

/**
 * Save a file to temporary storage and record metadata in database
 * @param file - The uploaded file object from Elysia
 * @param fileId - Unique identifier for the file (UUID)
 * @returns The saved temporary upload record
 */
export async function saveTemporaryFile(file: File, fileId: string) {
    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type;
    
    // Create unique file path with fileId prefix to avoid collisions
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const uniqueFileName = `${fileId}${extension}`;
    const filePath = join(TEMP_UPLOAD_DIR, uniqueFileName);
    
    // Save file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await Bun.write(filePath, buffer);
    
    // Record metadata in database
    const result = await db.insert(temporaryUploads).values({
        fileId,
        fileName,
        filePath,
        fileSize,
        mimeType,
        status: 'pending'
    }).returning();

    return result[0];
}

/**
 * Retrieve temporary upload metadata by file ID
 * @param fileId - The unique file identifier
 * @returns The temporary upload record or null if not found
 */
export async function getTemporaryFile(fileId: string) {
    const results = await db.select().from(temporaryUploads)
        .where(eq(temporaryUploads.fileId, fileId))
        .limit(1);
    
    return results.length > 0 ? results[0] : null;
}

/**
 * Mark a file as linked (used in a form submission)
 * @param fileId - The unique file identifier
 * @returns true if updated successfully, false if file not found
 */
export async function markFileAsLinked(fileId: string): Promise<boolean> {
    const existing = await getTemporaryFile(fileId);
    if (!existing) {
        return false;
    }
    
    await db.update(temporaryUploads)
        .set({ status: 'linked' })
        .where(eq(temporaryUploads.fileId, fileId));

    return true;
}

/**
 * Find orphan files (pending status older than specified hours)
 * @param olderThanHours - Age threshold in hours (default: 24)
 * @returns Array of orphan file records
 */
export async function getOrphanFiles(olderThanHours: number = 24): Promise<typeof temporaryUploads.$inferSelect[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);
    
    const results = await db.select().from(temporaryUploads)
        .where(
            and(
                eq(temporaryUploads.status, 'pending'),
                lt(temporaryUploads.createdAt, cutoffTime.toISOString())
            )
        );
    
    return results;
}

/**
 * Delete an orphan file from storage and database
 * @param fileId - The unique file identifier
 * @returns true if deleted successfully
 */
export async function deleteOrphanFile(fileId: string): Promise<boolean> {
    // Get file record
    const fileRecord = await getTemporaryFile(fileId);
    
    if (!fileRecord) {
        return false;
    }
    
    // Delete physical file if it exists
    if (existsSync(fileRecord.filePath)) {
        unlinkSync(fileRecord.filePath);
    }
    
    // Delete database record
    await db.delete(temporaryUploads)
        .where(eq(temporaryUploads.fileId, fileId));
    
    return true;
}

/**
 * Move file from temporary to permanent storage
 * @param fileId - The unique file identifier
 * @returns true if moved successfully
 */
export async function moveFileToPermanent(fileId: string): Promise<boolean> {
    const fileRecord = await getTemporaryFile(fileId);

    if (!fileRecord) {
        return false;
    }

    const extension = fileRecord.fileName.substring(fileRecord.fileName.lastIndexOf('.'));
    const newFileName = `${fileId}${extension}`;
    const newFilePath = join(PERMANENT_UPLOAD_DIR, newFileName);

    // Move file
    const file = Bun.file(fileRecord.filePath);
    await Bun.write(newFilePath, file);

    // Delete old file
    if (existsSync(fileRecord.filePath)) {
        unlinkSync(fileRecord.filePath);
    }

    // Update database record
    await db.update(temporaryUploads)
        .set({ filePath: newFilePath })
        .where(eq(temporaryUploads.fileId, fileId));

    return true;
}

/**
 * Generate a unique file ID (UUID)
 * @returns UUID string
 */
export function generateFileId(): string {
    return crypto.randomUUID();
}
