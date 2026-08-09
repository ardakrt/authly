import { describe, expect, it } from 'vitest';
import { runtimeInfoRequestSchema, runtimeInfoSchema } from '../../src/shared/schemas/runtime';

describe('runtime IPC schemas', () => {
  it('accepts only an empty request object', () => {
    expect(runtimeInfoRequestSchema.parse({})).toEqual({});
    expect(() => runtimeInfoRequestSchema.parse({ extra: true })).toThrow();
  });

  it('rejects malformed runtime replies', () => {
    expect(() =>
      runtimeInfoSchema.parse({
        appName: 'Authapp',
        appVersion: '0.1.0',
        platform: 'win32',
        packaged: 'no',
      }),
    ).toThrow();
  });
});
