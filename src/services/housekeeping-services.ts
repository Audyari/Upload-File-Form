/**
 * Housekeeping Services
 * Handles cleanup of orphan temporary files
 */

import { getOrphanFiles, deleteOrphanFile } from './uploads-services';

/**
 * Clean up orphan files older than specified hours
 * @param olderThanHours - Age threshold in hours (default: 24)
 * @returns Number of files cleaned up
 */
export async function cleanupOrphanFiles(olderThanHours: number = 24): Promise<number> {
    console.log(`Starting cleanup of orphan files older than ${olderThanHours} hours...`);
    
    // Get orphan files
    const orphanFiles = await getOrphanFiles(olderThanHours);
    
    if (orphanFiles.length === 0) {
        console.log('No orphan files found.');
        return 0;
    }
    
    console.log(`Found ${orphanFiles.length} orphan file(s) to clean up.`);
    
    // Delete each orphan file
    let deletedCount = 0;
    for (const file of orphanFiles) {
        try {
            const success = await deleteOrphanFile(file.fileId);
            if (success) {
                console.log(`Deleted orphan file: ${file.fileId}`);
                deletedCount++;
            } else {
                console.error(`Failed to delete orphan file: ${file.fileId}`);
            }
        } catch (error) {
            console.error(`Error deleting orphan file ${file.fileId}:`, error);
        }
    }
    
    console.log(`Cleanup complete. Deleted ${deletedCount} file(s).`);
    return deletedCount;
}
