/**
 * LLM Storage Service
 * 
 * Manages hybrid storage for LLM data:
 * - SQLite: Provider configs, response metadata
 * - Markdown files: Response content
 */

import { Database } from 'sqlite3';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { LLMProviderConfig, LLMResponseMetadata } from '@shared/types/llm';
import { PathValidator } from '../utils/pathValidator';
import { separateYamlAndContent } from '../utils/yamlParser';

export class LLMStorageService {
  private db: Database | null = null;
  private dbPath: string;
  private resultsPath: string;
  private pathValidator: PathValidator;
  private initialized = false;

  constructor(dbPath: string, resultsPath: string) {
    this.dbPath = dbPath;
    this.resultsPath = resultsPath;
    this.pathValidator = new PathValidator(resultsPath);
  }

  /**
   * Initialize database and file system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create results directory
    await fs.mkdir(this.resultsPath, { recursive: true });

    // Create database directory if it doesn't exist (SQLite creates the file, but not the directory)
    const dbDir = path.dirname(this.dbPath);
    await fs.mkdir(dbDir, { recursive: true });

    // Open database connection
    this.db = await this.openDatabase(this.dbPath);

    // Create tables if they don't exist
    await this.createTables();

    // Clear orphaned queue state from unexpected app kill
    await this.markPendingAsCancelled();

    // FR-036: Background cleanup - remove orphaned SQLite entries (metadata without .md file)
    await this.cleanupOrphanedEntries();

    this.initialized = true;
  }

  /**
   * Create LLM tables if they don't exist
   */
  private async createTables(): Promise<void> {
    const providerTableSQL = `
      CREATE TABLE IF NOT EXISTS provider_configurations (
        id TEXT PRIMARY KEY,
        provider_type TEXT NOT NULL CHECK(provider_type IN ('ollama', 'openai', 'azure_openai', 'gemini')),
        display_name TEXT NOT NULL,
        base_url TEXT,
        model_name TEXT,
        encrypted_credentials BLOB,
        timeout_seconds INTEGER DEFAULT 120,
        is_active INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_validated_at INTEGER,
        UNIQUE(provider_type)
      )
    `;

    const responsesTableSQL = `
      CREATE TABLE IF NOT EXISTS llm_responses (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL,
        provider TEXT NOT NULL CHECK(provider IN ('ollama', 'openai', 'azure_openai', 'gemini')),
        model TEXT NOT NULL,
        parameters TEXT,
        created_at INTEGER NOT NULL,
        response_time_ms INTEGER,
        token_usage_prompt INTEGER,
        token_usage_completion INTEGER,
        token_usage_total INTEGER,
        cost_estimate REAL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
        file_path TEXT NOT NULL,
        error_code TEXT,
        error_message TEXT
      )
    `;

    const indexSQL = [
      'CREATE INDEX IF NOT EXISTS idx_provider_active ON provider_configurations(is_active) WHERE is_active = 1',
      'CREATE INDEX IF NOT EXISTS idx_llm_responses_prompt_id ON llm_responses(prompt_id)',
      'CREATE INDEX IF NOT EXISTS idx_llm_responses_created_at ON llm_responses(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_llm_responses_status ON llm_responses(status)',
      'CREATE INDEX IF NOT EXISTS idx_llm_responses_provider ON llm_responses(provider)',
      'CREATE INDEX IF NOT EXISTS idx_llm_responses_title_status ON llm_responses(title_generation_status)'
    ];

    await this.runQuery(providerTableSQL);
    await this.runQuery(responsesTableSQL);
    
    // T011: Create title generation config table
    const titleConfigTableSQL = `
      CREATE TABLE IF NOT EXISTS title_generation_config (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        enabled INTEGER NOT NULL DEFAULT 1,
        selected_model TEXT NOT NULL DEFAULT 'gemma3:1b',
        selected_provider TEXT NOT NULL DEFAULT 'ollama',
        timeout_seconds INTEGER NOT NULL DEFAULT 30,
        updated_at INTEGER NOT NULL
      )
    `;
    await this.runQuery(titleConfigTableSQL);
    
    // Add title generation columns if they don't exist (backward compatibility)
    try {
      await this.runQuery(`ALTER TABLE llm_responses ADD COLUMN generated_title TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }
    try {
      await this.runQuery(`ALTER TABLE llm_responses ADD COLUMN title_generation_status TEXT CHECK(title_generation_status IN ('pending', 'completed', 'failed'))`);
    } catch (e) {
      // Column already exists, ignore
    }
    try {
      await this.runQuery(`ALTER TABLE llm_responses ADD COLUMN title_generated_at INTEGER`);
    } catch (e) {
      // Column already exists, ignore
    }
    try {
      await this.runQuery(`ALTER TABLE llm_responses ADD COLUMN title_model TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }
    
    for (const idx of indexSQL) {
      await this.runQuery(idx);
    }
  }

  /**
   * Open SQLite database
   */
  private openDatabase(dbPath: string): Promise<Database> {
    return new Promise((resolve, reject) => {
      const db = new Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
  }

  /**
   * Execute SQL query
   */
  private runQuery(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));
      
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get single row
   */
  private getRow<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));
      
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve((row as T) || null);
      });
    });
  }

  /**
   * Get multiple rows
   */
  private getAllRows<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));
      
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows as T[]) || []);
      });
    });
  }

  // ==================== Provider Configuration ====================

  async saveProviderConfig(config: LLMProviderConfig): Promise<void> {
    // If setting as active, deactivate others first
    if (config.isActive) {
      await this.runQuery(
        'UPDATE provider_configurations SET is_active = 0 WHERE provider_type != ?',
        [config.providerType]
      );
    }

    const sql = `
      INSERT OR REPLACE INTO provider_configurations (
        id, provider_type, display_name, base_url, model_name,
        encrypted_credentials, timeout_seconds, is_active,
        created_at, updated_at, last_validated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.runQuery(sql, [
      config.id,
      config.providerType,
      config.displayName,
      config.baseUrl || null,
      config.modelName || null,
      config.encryptedCredentials || null,
      config.timeoutSeconds,
      config.isActive ? 1 : 0,
      config.createdAt,
      config.updatedAt,
      config.lastValidatedAt || null
    ]);
  }

  async getProviderConfig(id: string): Promise<LLMProviderConfig | null> {
    const row = await this.getRow<any>(
      'SELECT * FROM provider_configurations WHERE id = ?',
      [id]
    );

    return row ? this.mapProviderConfig(row) : null;
  }

  async listProviderConfigs(): Promise<LLMProviderConfig[]> {
    const rows = await this.getAllRows<any>(
      'SELECT * FROM provider_configurations ORDER BY created_at DESC'
    );

    return rows.map(row => this.mapProviderConfig(row));
  }

  async getActiveProviderConfig(): Promise<LLMProviderConfig | null> {
    const row = await this.getRow<any>(
      'SELECT * FROM provider_configurations WHERE is_active = 1 LIMIT 1'
    );

    return row ? this.mapProviderConfig(row) : null;
  }

  async setActiveProvider(id: string): Promise<void> {
    // Deactivate all
    await this.runQuery('UPDATE provider_configurations SET is_active = 0');
    
    // Activate specified
    await this.runQuery(
      'UPDATE provider_configurations SET is_active = 1 WHERE id = ?',
      [id]
    );
  }

  async deleteProviderConfig(id: string): Promise<void> {
    await this.runQuery('DELETE FROM provider_configurations WHERE id = ?', [id]);
  }

  private mapProviderConfig(row: any): LLMProviderConfig {
    return {
      id: row.id,
      providerType: row.provider_type,
      displayName: row.display_name,
      baseUrl: row.base_url,
      modelName: row.model_name,
      encryptedCredentials: row.encrypted_credentials,
      timeoutSeconds: row.timeout_seconds,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastValidatedAt: row.last_validated_at
    };
  }

  // ==================== Response Metadata ====================

  async saveResponseMetadata(metadata: LLMResponseMetadata): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO llm_responses (
        id, prompt_id, provider, model, parameters,
        created_at, response_time_ms,
        token_usage_prompt, token_usage_completion, token_usage_total,
        cost_estimate, status, file_path, error_code, error_message,
        generated_title, title_generation_status, title_generated_at, title_model
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.runQuery(sql, [
      metadata.id,
      metadata.promptId,
      metadata.provider,
      metadata.model,
      JSON.stringify(metadata.parameters),
      metadata.createdAt,
      metadata.responseTimeMs || null,
      metadata.tokenUsage?.prompt || null,
      metadata.tokenUsage?.completion || null,
      metadata.tokenUsage?.total || null,
      metadata.costEstimate || null,
      metadata.status,
      metadata.filePath,
      metadata.errorCode || null,
      metadata.errorMessage || null,
      metadata.generatedTitle || null,
      metadata.titleGenerationStatus || null,
      metadata.titleGeneratedAt || null,
      metadata.titleModel || null
    ]);
  }

  async getResponseMetadata(id: string): Promise<LLMResponseMetadata | null> {
    const row = await this.getRow<any>(
      'SELECT * FROM llm_responses WHERE id = ?',
      [id]
    );

    return row ? this.mapResponseMetadata(row) : null;
  }

  // T030: Convenience methods for saveResponse/getResponse (alias for saveResponseMetadata/getResponseMetadata)
  async saveResponse(metadata: LLMResponseMetadata): Promise<void> {
    return this.saveResponseMetadata(metadata);
  }

  async getResponse(id: string): Promise<LLMResponseMetadata | null> {
    return this.getResponseMetadata(id);
  }

  async getResponseHistory(promptId: string): Promise<LLMResponseMetadata[]> {
    return this.listResponseMetadata(promptId);
  }

  async listResponseMetadata(promptId: string): Promise<LLMResponseMetadata[]> {
    const rows = await this.getAllRows<any>(
      'SELECT * FROM llm_responses WHERE prompt_id = ? ORDER BY created_at DESC',
      [promptId]
    );

    const metadataList = rows.map(row => this.mapResponseMetadata(row));
    
    // FR-035: Real-time file existence check - filter out entries with missing .md files
    const validMetadata: LLMResponseMetadata[] = [];
    for (const metadata of metadataList) {
      const filePath = path.join(this.resultsPath, metadata.filePath);
      try {
        await fs.access(filePath);
        validMetadata.push(metadata);
      } catch (err) {
        // File doesn't exist - skip this entry (will be cleaned up in background)
        console.log(`[LLM Storage] Skipping orphaned response ${metadata.id} - file not found: ${metadata.filePath}`);
      }
    }
    
    return validMetadata;
  }

  async updateResponseStatus(
    id: string,
    status: 'pending' | 'completed' | 'failed' | 'cancelled'
  ): Promise<void> {
    await this.runQuery(
      'UPDATE llm_responses SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  async markPendingAsCancelled(): Promise<void> {
    await this.runQuery(
      "UPDATE llm_responses SET status = 'cancelled' WHERE status = 'pending'"
    );
  }

  /**
   * FR-036: Background cleanup on app start
   * Remove orphaned SQLite entries where .md file is missing
   */
  async cleanupOrphanedEntries(): Promise<void> {
    console.log('[LLM Storage] Running orphaned entries cleanup...');
    
    // Get all responses
    const rows = await this.getAllRows<any>('SELECT id, file_path FROM llm_responses');
    
    let removedCount = 0;
    for (const row of rows) {
      const filePath = path.join(this.resultsPath, row.file_path);
      try {
        await fs.access(filePath);
        // File exists, keep the entry
      } catch (err) {
        // File doesn't exist, delete the SQLite entry
        console.log(`[LLM Storage] Removing orphaned entry ${row.id} - file not found: ${row.file_path}`);
        await this.runQuery('DELETE FROM llm_responses WHERE id = ?', [row.id]);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`[LLM Storage] Cleanup complete: removed ${removedCount} orphaned entries`);
    } else {
      console.log('[LLM Storage] Cleanup complete: no orphaned entries found');
    }
  }

  async deleteResponse(id: string): Promise<void> {
    // Get metadata for file path
    const metadata = await this.getResponseMetadata(id);
    
    if (metadata) {
      // Delete markdown file (ignore errors if file doesn't exist)
      const filePath = path.join(this.resultsPath, metadata.filePath);
      
      // Validate path
      this.pathValidator.validatePath(metadata.filePath);
      
      try {
        await fs.unlink(filePath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn(`Failed to delete response file: ${err.message}`);
        }
      }
    }

    // Delete metadata
    await this.runQuery('DELETE FROM llm_responses WHERE id = ?', [id]);
  }

  async deleteAllResponses(promptId: string): Promise<void> {
    // Get all responses for this prompt
    const responses = await this.listResponseMetadata(promptId);

    // Delete each response (includes file deletion)
    for (const response of responses) {
      await this.deleteResponse(response.id);
    }
  }

  private mapResponseMetadata(row: any): LLMResponseMetadata {
    const metadata: LLMResponseMetadata = {
      id: row.id,
      promptId: row.prompt_id,
      provider: row.provider,
      model: row.model,
      parameters: JSON.parse(row.parameters || '{}'),
      createdAt: row.created_at,
      status: row.status,
      filePath: row.file_path
    };

    if (row.response_time_ms) metadata.responseTimeMs = row.response_time_ms;
    if (row.token_usage_total) {
      metadata.tokenUsage = {
        prompt: row.token_usage_prompt || 0,
        completion: row.token_usage_completion || 0,
        total: row.token_usage_total
      };
    }
    if (row.cost_estimate) metadata.costEstimate = row.cost_estimate;
    if (row.error_code) metadata.errorCode = row.error_code;
    if (row.error_message) metadata.errorMessage = row.error_message;
    
    // T030: Map title fields
    if (row.generated_title) metadata.generatedTitle = row.generated_title;
    if (row.title_generation_status) metadata.titleGenerationStatus = row.title_generation_status;
    if (row.title_generated_at) metadata.titleGeneratedAt = row.title_generated_at;
    if (row.title_model) metadata.titleModel = row.title_model;

    return metadata;
  }

  // ==================== Response Content (Markdown Files) ====================

  /**
   * Sanitize prompt name for use as directory name
   * - Replace invalid filename characters with underscores
   * - Limit length to 100 characters
   * - Append prompt ID suffix for uniqueness
   */
  private sanitizePromptName(promptName: string, promptId: string): string {
    // Replace invalid characters (Windows + Unix)
    const sanitized = promptName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .trim()
      .substring(0, 100);
    
    // Append ID for uniqueness (last 8 chars of UUID)
    const idSuffix = promptId.substring(promptId.length - 8);
    return `${sanitized}_${idSuffix}`;
  }

  /**
   * Escape YAML special characters in string values
   * For use in YAML frontmatter (not for block scalars)
   */
  private escapeYamlString(str: string): string {
    // For block scalars (|), we don't need escaping, but for inline strings we do
    // Since we're using | for prompt, we don't need this, but keeping for other fields
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * Format YAML frontmatter with metadata
   * Uses YAML literal block scalar (|) for multi-line prompt to preserve formatting
   * 
   * Safety: YAML literal block scalars handle special characters like `|` and `---` safely
   * because:
   * 1. Content is indented (2 spaces), so `---` at start of line won't match frontmatter delimiter
   * 2. `|` character in content is just a regular character
   * 3. The frontmatter delimiter `---` is at column 0, while prompt content is indented
   */
  private formatFrontmatter(metadata: LLMResponseMetadata, promptContent: string): string {
    // Build frontmatter object (without prompt first)
    const frontmatter: any = {
      id: metadata.id,
      prompt_id: metadata.promptId,
      provider: metadata.provider,
      model: metadata.model,
      created_at: new Date(metadata.createdAt).toISOString(),
      ...(metadata.responseTimeMs && { response_time_ms: metadata.responseTimeMs }),
      ...(metadata.parameters && Object.keys(metadata.parameters).length > 0 && {
        parameters: metadata.parameters
      }),
      ...(metadata.tokenUsage && {
        token_usage: {
          prompt: metadata.tokenUsage.prompt || 0,
          completion: metadata.tokenUsage.completion || 0,
          total: metadata.tokenUsage.total || 0
        }
      }),
      ...(metadata.costEstimate !== undefined && { cost_estimate: metadata.costEstimate }),
      status: metadata.status,
      ...(metadata.errorCode && { error_code: metadata.errorCode }),
      ...(metadata.errorMessage && { error_message: metadata.errorMessage }),
      // T031: Add title fields to markdown frontmatter
      ...(metadata.generatedTitle && { generated_title: metadata.generatedTitle }),
      ...(metadata.titleGenerationStatus && { title_generation_status: metadata.titleGenerationStatus }),
      ...(metadata.titleGeneratedAt && { title_generated_at: new Date(metadata.titleGeneratedAt).toISOString() }),
      ...(metadata.titleModel && { title_model: metadata.titleModel })
    };

    // Generate YAML for all fields except prompt
    let yamlStr = yaml.dump(frontmatter, {
      indent: 2,
      lineWidth: -1, // No line wrapping
      noRefs: true,
      sortKeys: false
    });

    // Format prompt as YAML literal block scalar (|) to preserve all formatting
    // YAML literal block scalars safely handle `|`, `---`, and other special characters
    // because the content is indented, so it won't be confused with YAML delimiters
    const promptLines = promptContent.split('\n');
    
    // Handle empty lines and ensure proper indentation
    // Each line gets 2-space indent (standard YAML block scalar indentation)
    const indentedPromptLines = promptLines.map((line: string) => {
      // Empty lines should still have indentation to maintain structure
      return line === '' ? '  ' : `  ${line}`;
    });
    
    const promptBlock = `prompt: |\n${indentedPromptLines.join('\n')}`;
    
    // Insert prompt after model line for logical ordering
    const lines = yamlStr.split('\n');
    const modelIndex = lines.findIndex((line: string) => line.startsWith('model:'));
    if (modelIndex >= 0) {
      // Insert after model line
      lines.splice(modelIndex + 1, 0, promptBlock);
    } else {
      // Fallback: insert after created_at
      const createdAtIndex = lines.findIndex((line: string) => line.startsWith('created_at:'));
      if (createdAtIndex >= 0) {
        lines.splice(createdAtIndex + 1, 0, promptBlock);
      } else {
        // Last resort: insert at beginning (after first line)
        lines.splice(1, 0, promptBlock);
      }
    }

    return lines.join('\n');
  }

  async saveResponseContent(
    promptId: string,
    promptName: string,
    responseId: string,
    content: string,
    metadata: LLMResponseMetadata,
    promptContent: string
  ): Promise<string> {
    const dirName = this.sanitizePromptName(promptName, promptId);
    const fileName = `${responseId}.md`;
    const relativePath = path.join(dirName, fileName);
    
    // Validate path
    this.pathValidator.validatePath(relativePath);
    
    const promptDir = path.join(this.resultsPath, dirName);
    const filePath = path.join(promptDir, fileName);

    // Create prompt directory
    await fs.mkdir(promptDir, { recursive: true });

    // Generate frontmatter with metadata and prompt
    const frontmatter = this.formatFrontmatter(metadata, promptContent);
    
    // Combine frontmatter and content
    const fullContent = `---\n${frontmatter}\n---\n\n${content}`;

    // Write file with frontmatter
    await fs.writeFile(filePath, fullContent, 'utf-8');
    
    // Return the relative path for storing in SQLite
    return relativePath;
  }

  async getResponseContent(filePath: string): Promise<string> {
    // filePath is stored as "{sanitized-name}_{id-suffix}/{response-id}.md"
    // Validate path
    this.pathValidator.validatePath(filePath);
    
    const fullPath = path.join(this.resultsPath, filePath);

    // Read file
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    
    // Parse frontmatter and extract content
    try {
      const { content } = separateYamlAndContent(fileContent);
      return content;
    } catch (error) {
      // If frontmatter parsing fails, return raw content (backward compatibility)
      console.warn(`[LLM Storage] Failed to parse frontmatter for ${filePath}, returning raw content:`, error);
      return fileContent;
    }
  }

  /**
   * Update markdown file frontmatter with title generation metadata
   * This method reads the existing markdown file, updates the frontmatter with title fields,
   * and writes it back
   */
  async updateResponseTitle(responseId: string): Promise<void> {
    // Get response metadata (which should already be updated with title)
    const metadata = await this.getResponseMetadata(responseId);
    if (!metadata || !metadata.filePath) {
      throw new Error(`Response ${responseId} not found or has no file path`);
    }

    // Validate path
    this.pathValidator.validatePath(metadata.filePath);
    
    const fullPath = path.join(this.resultsPath, metadata.filePath);

    // Read existing file
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    
    // Parse frontmatter and content
    const { yamlHeader, content } = separateYamlAndContent(fileContent);
    
    // Parse YAML to object
    const frontmatter = yaml.load(yamlHeader) as any;
    
    // Update frontmatter with title fields
    if (metadata.generatedTitle) {
      frontmatter.generated_title = metadata.generatedTitle;
    }
    if (metadata.titleGenerationStatus) {
      frontmatter.title_generation_status = metadata.titleGenerationStatus;
    }
    if (metadata.titleGeneratedAt) {
      frontmatter.title_generated_at = new Date(metadata.titleGeneratedAt).toISOString();
    }
    if (metadata.titleModel) {
      frontmatter.title_model = metadata.titleModel;
    }

    // Generate updated frontmatter YAML
    const updatedYaml = yaml.dump(frontmatter, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });

    // Reconstruct file with updated frontmatter
    const updatedContent = `---\n${updatedYaml}---\n\n${content}`;
    
    // Write back to file
    await fs.writeFile(fullPath, updatedContent, 'utf-8');
  }

  // ==================== Title Generation Config ====================

  /**
   * T065: Get title generation configuration
   */
  async getTitleGenerationConfig(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT * FROM title_generation_config WHERE id = 1',
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              enabled: row.enabled === 1,
              selectedModel: row.selected_model,
              selectedProvider: row.selected_provider,
              timeoutSeconds: row.timeout_seconds
            });
          } else {
            // Return default config
            resolve({
              enabled: true,
              selectedModel: 'gemma3:1b',
              selectedProvider: 'ollama',
              timeoutSeconds: 30
            });
          }
        }
      );
    });
  }

  /**
   * T066: Update title generation configuration with validation
   */
  async updateTitleGenerationConfig(config: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // T062: Validate timeout (10-120 seconds)
    if (config.timeoutSeconds < 10 || config.timeoutSeconds > 120) {
      throw new Error('Timeout must be between 10 and 120 seconds');
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO title_generation_config 
         (id, enabled, selected_model, selected_provider, timeout_seconds, updated_at)
         VALUES (1, ?, ?, ?, ?, ?)`,
        [
          config.enabled ? 1 : 0,
          config.selectedModel,
          config.selectedProvider,
          config.timeoutSeconds,
          Date.now()
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // ==================== Cleanup ====================

  async close(): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.db = null;
    }
    this.initialized = false;
  }
}

