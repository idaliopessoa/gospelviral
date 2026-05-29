import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('readEnv', () => {
  it('returns apiKey undefined when ANTHROPIC_API_KEY is unset', async () => {
    // Arrange
    delete process.env.ANTHROPIC_API_KEY;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().apiKey).toBeUndefined();
  });

  it('returns apiKey undefined when ANTHROPIC_API_KEY is empty string', async () => {
    // Arrange
    process.env.ANTHROPIC_API_KEY = '';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().apiKey).toBeUndefined();
  });

  it('returns apiKey value when ANTHROPIC_API_KEY is set', async () => {
    // Arrange
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-123';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().apiKey).toBe('sk-ant-test-123');
  });

  it('defaults port to 8787 when PORT is unset', async () => {
    // Arrange
    delete process.env.PORT;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().port).toBe(8787);
  });

  it('parses PORT as an integer', async () => {
    // Arrange
    process.env.PORT = '4321';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().port).toBe(4321);
  });

  it('falls back to default port when PORT is garbage', async () => {
    // Arrange
    process.env.PORT = 'not-a-number';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().port).toBe(8787);
  });

  it('defaults logLevel to "info" when LOG_LEVEL is unset', async () => {
    // Arrange
    delete process.env.LOG_LEVEL;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().logLevel).toBe('info');
  });

  it('clamps unknown LOG_LEVEL values to "info"', async () => {
    // Arrange
    process.env.LOG_LEVEL = 'trace';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().logLevel).toBe('info');
  });

  it('parses ANALYZE_TIMEOUT_MS as integer with a 600_000 default (TASK_020)', async () => {
    // Arrange
    delete process.env.ANALYZE_TIMEOUT_MS;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert — 10 min: a real CLI analysis runs for minutes; 120 s killed it
    expect(readEnv().analyzeTimeoutMs).toBe(600_000);

    // Arrange
    process.env.ANALYZE_TIMEOUT_MS = '60000';

    // Act
    const { readEnv: readEnv2 } = await import('./env.js');

    // Assert
    expect(readEnv2().analyzeTimeoutMs).toBe(60_000);
  });

  it('defaults videoUploadDir to <cwd>/apps/server/.tmp/video-uploads when unset', async () => {
    // Arrange
    delete process.env.VIDEO_UPLOAD_DIR;

    // Act
    const { readEnv } = await import('./env.js');
    const { videoUploadDir } = readEnv();

    // Assert — absolute path, ends with apps/server/.tmp/video-uploads
    expect(videoUploadDir.startsWith('/')).toBe(true);
    expect(videoUploadDir.endsWith('apps/server/.tmp/video-uploads')).toBe(true);
  });

  it('honors absolute VIDEO_UPLOAD_DIR overrides verbatim', async () => {
    // Arrange
    process.env.VIDEO_UPLOAD_DIR = '/var/tmp/custom-uploads';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().videoUploadDir).toBe('/var/tmp/custom-uploads');
  });

  it('resolves relative VIDEO_UPLOAD_DIR against process.cwd()', async () => {
    // Arrange
    process.env.VIDEO_UPLOAD_DIR = 'relative/dir';

    // Act
    const { readEnv } = await import('./env.js');
    const { videoUploadDir } = readEnv();

    // Assert
    expect(videoUploadDir.startsWith('/')).toBe(true);
    expect(videoUploadDir.endsWith('/relative/dir')).toBe(true);
  });

  it('defaults maxUploadSizeBytes to 2 GiB when MAX_UPLOAD_SIZE_BYTES is unset', async () => {
    // Arrange
    delete process.env.MAX_UPLOAD_SIZE_BYTES;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().maxUploadSizeBytes).toBe(2_147_483_648);
  });

  it('parses MAX_UPLOAD_SIZE_BYTES as integer; falls back to default on garbage', async () => {
    // Arrange
    process.env.MAX_UPLOAD_SIZE_BYTES = '524288000';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().maxUploadSizeBytes).toBe(524_288_000);

    // Arrange — garbage falls back
    process.env.MAX_UPLOAD_SIZE_BYTES = 'not-a-number';

    // Act
    const { readEnv: readEnv2 } = await import('./env.js');

    // Assert
    expect(readEnv2().maxUploadSizeBytes).toBe(2_147_483_648);
  });

  it('defaults videoAllowedMimes to the shared whitelist when VIDEO_ALLOWED_MIMES is unset', async () => {
    // Arrange
    delete process.env.VIDEO_ALLOWED_MIMES;

    // Act
    const { readEnv } = await import('./env.js');
    const { videoAllowedMimes } = readEnv();

    // Assert
    expect(videoAllowedMimes).toBeInstanceOf(Set);
    expect([...videoAllowedMimes].sort()).toEqual([
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ]);
  });

  it('parses VIDEO_ALLOWED_MIMES as a comma-separated list, trimming + lowercasing', async () => {
    // Arrange
    process.env.VIDEO_ALLOWED_MIMES = ' Video/MP4 , video/quicktime ';

    // Act
    const { readEnv } = await import('./env.js');
    const { videoAllowedMimes } = readEnv();

    // Assert
    expect([...videoAllowedMimes].sort()).toEqual(['video/mp4', 'video/quicktime']);
  });
});
