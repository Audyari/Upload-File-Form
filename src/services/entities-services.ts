/**
 * Entity Services
 * Handles business logic for entity form submissions
 */

import { db } from '../db';
import { entities, temporaryUploads } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTemporaryFile, markFileAsLinked, moveFileToPermanent } from './uploads-services';

/**
 * Create a new entity with an optional linked file
 * @param name - Entity name
 * @param description - Entity description
 * @param fileId - Optional file ID from temporary upload
 * @returns The created entity record
 */
export async function createEntity(name: string, description: string | null, fileId: string | null) {
    const result = await db.insert(entities).values({
        name,
        description,
        fileId,
        createdAt: new Date().toISOString()
    }).returning();
    
    return result[0];
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
 * Link a file to an entity and move to permanent storage
 * @param fileId - The file ID to link
 * @returns true if linked successfully
 */
export async function linkFileToFileId(fileId: string): Promise<boolean> {
    // Mark file as linked in temporary_uploads table
    const marked = await markFileAsLinked(fileId);
    
    if (!marked) {
        return false;
    }
    
    // Move file to permanent storage
    await moveFileToPermanent(fileId);
    
    return true;
}

/**
 * Get entity by ID
 * @param id - Entity ID
 * @returns Entity record or null if not found
 */
export async function getEntityById(id: number) {
    const allEntities = await db.select().from(entities);
    const found = allEntities.find(e => e.id === id);
    return found || null;
}
