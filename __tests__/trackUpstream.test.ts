// The pins we hold are the ones upstream's release states, and scripts/track-upstream.mjs reads both the same way it
// will read a newer release.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// @ts-expect-error plain JavaScript helper
import { PINS, differences, ourPins, ourUpstreamVersion } from '../scripts/track-upstream.mjs';

const upstream = join(__dirname, '..', 'node_modules/@capacitor-community/admob');

describe('track-upstream', () => {
  it('tracks the upstream version the parity test reads', () => {
    expect(ourUpstreamVersion()).toBe(JSON.parse(readFileSync(join(upstream, 'package.json'), 'utf8')).version);
  });

  it('holds the native SDK versions that release pins', () => {
    const theirs: Record<string, string> = {};
    const files: Record<string, string> = {};
    for (const [key, pin] of Object.entries(PINS as Record<string, { upstream: [string, RegExp] }>)) {
      const [file, pattern] = pin.upstream;
      files[file] ??= readFileSync(join(upstream, file), 'utf8');
      const found = pattern.exec(files[file]!);
      expect(found, `${key} in upstream ${file}`).not.toBeNull();
      theirs[key] = found![1]!;
    }
    expect(differences(ourPins(), theirs)).toEqual([]);
  });

  it('sees a moved pin', () => {
    const ours = ourPins();
    expect(differences(ours, { ...ours, gmaIos: '99.0.0' })).toEqual([
      ['Google Mobile Ads (iOS)', ours.gmaIos, '99.0.0'],
    ]);
  });
});
