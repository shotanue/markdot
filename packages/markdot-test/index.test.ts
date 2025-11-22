import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const binaryPath = path.resolve(__dirname, '../markdot/markdot');

describe('markdot binary', () => {
  it('should execute and show help or version', async () => {
    try {
      const { stdout } = await execFileAsync(binaryPath, ['--help']);
      expect(stdout).toContain('Usage'); // Adjust expectation based on actual help output
    } catch (error: any) {
       // If the binary fails, we might want to know why. 
       // But if it's just a non-zero exit code for help (some apps do that), we might need to adjust.
       // For now assuming --help returns 0.
       throw new Error(`Failed to execute binary: ${error.message}\nStderr: ${error.stderr}`);
    }
  });
});
