/**
 * File Validator Utility
 * Validates file extensions and file size for uploads
 */

// Whitelist of allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate file extension against whitelist
 * @param fileName - The name of the file to validate
 * @returns true if extension is allowed, false otherwise
 */
export function isValidExtension(fileName: string): boolean {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Validate file size against maximum limit
 * @param fileSize - The size of the file in bytes
 * @returns true if file size is within limit, false otherwise
 */
export function isValidFileSize(fileSize: number): boolean {
    return fileSize <= MAX_FILE_SIZE;
}

/**
 * Get validation error message if any
 * @param fileName - The name of the file
 * @param fileSize - The size of the file in bytes
 * @returns Error message or null if valid
 */
export function getValidationError(fileName: string, fileSize: number): string | null {
    if (!isValidExtension(fileName)) {
        return `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    
    if (!isValidFileSize(fileSize)) {
        return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    
    return null;
}
