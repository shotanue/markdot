import { describe, it, expect } from 'vitest';
import { runBinary, version } from './test-utils';

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
