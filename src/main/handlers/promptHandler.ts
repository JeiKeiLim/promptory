/**
 * Prompt Handler for IPC operations (T101-T104)
 * 
 * Handles prompt metadata updates like favorite status.
 */

import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import * as yaml from 'js-yaml';

/**
 * Parse YAML front matter from markdown content
 */
function parseFrontMatter(content: string): { frontMatter: any; body: string } {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return { frontMatter: {}, body: content };
  }

  try {
    const frontMatter = yaml.load(match[1]) || {};
    const body = match[2];
    return { frontMatter, body };
  } catch (error) {
    console.error('Failed to parse YAML front matter:', error);
    return { frontMatter: {}, body: content };
  }
}

/**
 * Serialize front matter and body back to markdown
 */
function serializeFrontMatter(frontMatter: any, body: string): string {
  const yamlStr = yaml.dump(frontMatter, { lineWidth: -1 });
  return `---\n${yamlStr}---\n${body}`;
}

/**
 * T101: Register PROMPT_UPDATE_FAVORITE IPC handler
 */
export function registerPromptHandlers(): void {
  // T102-T104: Update favorite field in prompt file
  ipcMain.handle(
    IPC_CHANNELS.PROMPT_UPDATE_FAVORITE,
    async (_event, { id, favorite }: { id: string; favorite: boolean }) => {
      try {
        // T104: Validate input
        if (!id || typeof favorite !== 'boolean') {
          throw new Error('Invalid parameters: id and favorite are required');
        }

        // Reconstruct file path from id
        // Assuming id format: "category/filename" (without .md extension)
        const promptPath = `${id}.md`;

        // T104: Check if file exists
        try {
          await fs.access(promptPath);
        } catch {
          return {
            success: false,
            error: 'Prompt file not found',
          };
        }

        // T102: Read and parse file
        let content: string;
        try {
          content = await fs.readFile(promptPath, 'utf-8');
        } catch (error: any) {
          // T104: Permission errors
          if (error.code === 'EACCES') {
            return {
              success: false,
              error: 'Permission denied: cannot read prompt file',
            };
          }
          throw error;
        }

        // T102: Parse YAML front matter
        let frontMatter: any;
        let body: string;
        try {
          const parsed = parseFrontMatter(content);
          frontMatter = parsed.frontMatter;
          body = parsed.body;
        } catch (error) {
          // T104: YAML parse errors
          return {
            success: false,
            error: 'Failed to parse prompt metadata',
          };
        }

        // T102: Update favorite field
        frontMatter.favorite = favorite;

        // Serialize back to markdown
        const updatedContent = serializeFrontMatter(frontMatter, body);

        // T103: Atomic file write (write to .tmp, then rename)
        const tmpPath = `${promptPath}.tmp`;
        try {
          await fs.writeFile(tmpPath, updatedContent, 'utf-8');
          await fs.rename(tmpPath, promptPath);
        } catch (error: any) {
          // T104: Clean up tmp file on error
          try {
            await fs.unlink(tmpPath);
          } catch {
            // Ignore cleanup errors
          }

          // T104: Permission errors on write
          if (error.code === 'EACCES') {
            return {
              success: false,
              error: 'Permission denied: cannot write to prompt file',
            };
          }
          throw error;
        }

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
