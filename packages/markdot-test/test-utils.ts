import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const binaryPath = path.resolve(__dirname, '../markdot/markdot');

export const runBinary = (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
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

// Read version from package.json (shared utility)
const packageJsonPath = path.resolve(__dirname, '../markdot/package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
export const version = packageJson.version;
