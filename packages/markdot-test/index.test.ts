import { describe, it, expect } from 'vitest';
import { runBinary } from './test-utils';
import path from 'node:path';
import fs from 'node:fs';

// Read version from package.json
const packageJsonPath = path.resolve(__dirname, '../markdot/package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

describe('markdot binary', () => {
    it('should execute and show version', async () => {
        const { stdout, stderr } = await runBinary(['--version']);
        const output = stdout + stderr;
        expect(output).toContain(version);
    });

    it('should execute and show help', async () => {
        const { stdout, stderr } = await runBinary(['--help']);
        const output = stdout + stderr;
        expect(output).toContain('USAGE');
        expect(output).toContain('markdot');
    });
});
