import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const temporaryUploads = sqliteTable('temporary_uploads', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fileId: text('file_id').notNull().unique(),
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'linked'
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`)
});

export const entities = sqliteTable('entities', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    fileId: text('file_id'),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`)
});
