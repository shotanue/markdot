import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';

const binaryPath = path.resolve(__dirname, '../markdot/markdot');

const runBinary = (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise((resolve, reject) => {
        const proc = spawn(binaryPath, args, {
            stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin, pipe stdout and stderr
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (exitCode) => {
            resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
        });

        proc.on('error', (error) => {
            reject(error);
        });
    });
};

describe('markdot binary', () => {
    it('should execute and show version', async () => {
        const { stdout, stderr } = await runBinary(['--version']);
        const output = stdout + stderr;
        expect(output).toContain('0.0.12');
    });

    it('should execute and show help', async () => {
        const { stdout, stderr } = await runBinary(['--help']);
        const output = stdout + stderr;
        expect(output).toContain('USAGE');
        expect(output).toContain('markdot');
    });
});
