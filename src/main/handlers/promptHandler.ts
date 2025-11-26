/**
 * Prompt Handler for IPC operations (T101-T104)
 * 
 * Handles prompt metadata updates like favorite status.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { getSharedFileService } from './fileHandlers';

/**
 * T101: Register PROMPT_UPDATE_FAVORITE IPC handler
 */
export function registerPromptHandlers(): void {
  // T102-T104: Update favorite field in prompt file
  ipcMain.handle(
    IPC_CHANNELS.PROMPT_UPDATE_FAVORITE,
    async (_event, { id, path, favorite }: { id: string; path?: string; favorite: boolean }) => {
      try {
        // T104: Validate input
        if (typeof favorite !== 'boolean') {
          throw new Error('Invalid parameters: favorite must be a boolean');
        }

        // Path is required (id is a base64 hash, not usable as path)
        if (!path) {
          throw new Error('Invalid parameters: path is required');
        }

        const service = getSharedFileService();

        // T102: Read the file to get current metadata and content
        const file = await service.readFile(path);
        
        if (file.error) {
          return {
            success: false,
            error: `Failed to read prompt: ${file.error.message}`,
          };
        }

        // T102: Update favorite field in metadata
        const updatedMetadata = {
          ...file.metadata,
          favorite,
        };

        // T103: Update file with atomic write (handled by FileService)
        await service.updateFile(path, {
          metadata: updatedMetadata,
          content: file.content,
        });

        return {
          success: true,
        };
      } catch (error: any) {
        console.error('Failed to update prompt favorite:', error);
        return {
          success: false,
          error: error.message || 'Unknown error occurred',
        };
      }
    }
  );

  console.log('Prompt handlers registered');
}
