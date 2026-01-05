/**
 * Type declarations for Node.js built-in sqlite module (Node.js 22.5+)
 */
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean });
    prepare(sql: string): Statement;
    close(): void;
  }

  interface Statement {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  }
}
