/**
 * Entity Services
 * Handles business logic for entity form submissions
 */

import { db } from '../db';
import { entities, temporaryUploads } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTemporaryFile, markFileAsLinked, moveFileToPermanent } from './uploads-services';

/**
 * Create a new entity with an optional linked file (with transaction)
 * @param name - Entity name
 * @param description - Entity description
 * @param fileId - Optional file ID from temporary upload
 * @returns The created entity record
 */
export async function createEntityWithFileLink(name: string, description: string | null, fileId: string | null) {
    await db.transaction(async (tx) => {
        // Create entity
        await tx.insert(entities).values({
            name,
            description,
            fileId,
        });

        // Link file if provided
        if (fileId) {
            // Mark file as linked in temporary_uploads table
            await tx.update(temporaryUploads)
                .set({ status: 'linked' })
                .where(eq(temporaryUploads.fileId, fileId));

            // Move file to permanent storage
            await moveFileToPermanent(fileId);
        }
    });
}

/**
 * Validate that a file exists in temporary uploads
 * @param fileId - The file ID to validate
 * @returns true if file exists, false otherwise
 */
export async function validateFileExists(fileId: string): Promise<boolean> {
    const fileRecord = await getTemporaryFile(fileId);
    return fileRecord !== null;
}

/**
 * Get entity by ID
 * @param id - Entity ID
 * @returns Entity record or null if not found
 */
export async function getEntityById(id: number) {
    const results = await db.select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);
    return results[0] || null;
}
