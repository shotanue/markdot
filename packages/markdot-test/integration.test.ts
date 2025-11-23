import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { runBinary } from './test-utils';

const createTempFile = (content: string, ext = '.md'): string => {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `markdot-test-${Date.now()}-${Math.random()}${ext}`);
    fs.writeFileSync(filePath, content);
    return filePath;
};

describe('markdot integration', () => {
    const createdFiles: string[] = [];

    afterEach(() => {
        createdFiles.forEach((file) => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
        createdFiles.length = 0;
    });

    const registerCleanup = (filePath: string) => {
        createdFiles.push(filePath);
        return filePath;
    };

    it('should not execute codeblock with ::ignore', async () => {
        const sideEffectFile = registerCleanup(path.join(os.tmpdir(), `side-effect-ignore-${Date.now()}`));
        const markdown = `
\`\`\`bash ::ignore
touch ${sideEffectFile}
\`\`\`
        `;
        const mdFile = registerCleanup(createTempFile(markdown));

        await runBinary([mdFile]);

        expect(fs.existsSync(sideEffectFile)).toBe(false);
    });

    it('should copy but not execute codeblock with ::to', async () => {
        const sideEffectFile = registerCleanup(path.join(os.tmpdir(), `side-effect-to-${Date.now()}`));
        const targetFile = registerCleanup(path.join(os.tmpdir(), `target-file-${Date.now()}`));

        const markdown = `
\`\`\`bash ::to=${targetFile}
touch ${sideEffectFile}
\`\`\`
        `;
        const mdFile = registerCleanup(createTempFile(markdown));

        await runBinary([mdFile]);

        // Should be copied
        expect(fs.existsSync(targetFile)).toBe(true);
        const content = fs.readFileSync(targetFile, 'utf-8');
        expect(content).toContain(`touch ${sideEffectFile}`);

        // Should NOT be executed
        expect(fs.existsSync(sideEffectFile)).toBe(false);
    });

    it('should execute bash codeblock without tags', async () => {
        const sideEffectFile = registerCleanup(path.join(os.tmpdir(), `side-effect-exec-${Date.now()}`));
        const markdown = `
\`\`\`bash
touch ${sideEffectFile}
\`\`\`
        `;
        const mdFile = registerCleanup(createTempFile(markdown));

        await runBinary([mdFile]);

        expect(fs.existsSync(sideEffectFile)).toBe(true);
    });

    // Test other shells if possible (assuming they exist in environment, or at least markdot logic handles them)
    // Since we fixed the logic based on `lang()` check, we can verify zsh/fish logic is suppressed.
    // However, executing them requires the shell to be installed.
    // We can rely on the fact that if `executeShellScript` was called, it would try to run.
    // But checking side effects is better.
    // Assuming zsh might not be in the minimal environment, but let's try or skip if needed.
    // We can verify the logic by checking the output log if possible, but markdot logs might not be verbose enough.
    // Let's assume sh/bash are always there.

    it('should copy but not execute sh codeblock with ::to', async () => {
        const sideEffectFile = registerCleanup(path.join(os.tmpdir(), `side-effect-sh-${Date.now()}`));
        const targetFile = registerCleanup(path.join(os.tmpdir(), `target-sh-${Date.now()}`));

        const markdown = `
\`\`\`sh ::to=${targetFile}
touch ${sideEffectFile}
\`\`\`
        `;
        const mdFile = registerCleanup(createTempFile(markdown));

        await runBinary([mdFile]);

        expect(fs.existsSync(targetFile)).toBe(true);
        expect(fs.existsSync(sideEffectFile)).toBe(false);
    });
});
