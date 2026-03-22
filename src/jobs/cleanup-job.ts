/**
 * Cleanup Job
 * Cron job to clean up orphan temporary files
 * 
 * Run this script manually or schedule with cron:
 * - Windows Task Scheduler
 * - Linux crontab: 0 2 * * * bun run jobs:cleanup
 */

import { cleanupOrphanFiles } from '../services/housekeeping-services';

// Default: clean up files older than 24 hours
const OLDER_THAN_HOURS = 24;

async function runCleanup() {
    try {
        const deletedCount = await cleanupOrphanFiles(OLDER_THAN_HOURS);
        console.log(`Cleanup job completed. Deleted ${deletedCount} file(s).`);
        process.exit(0);
    } catch (error) {
        console.error('Cleanup job failed:', error);
        process.exit(1);
    }
}

runCleanup();
