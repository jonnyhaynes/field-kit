import { describe, expect, it } from '@jest/globals';

import { canNfc, platformAllowsNfc } from '../can-nfc';

describe('whether the platform permits NFC', () => {
  it('permits Android, which needs no entitlement', () => {
    expect(platformAllowsNfc('android')).toBe(true);
  });

  it('does not permit iOS, which needs the reader-session entitlement', () => {
    // The Apple Developer account is still open (§2.5), so iOS gets no tag controls rather than a
    // control that can only fail. This is the single place that decides it.
    expect(platformAllowsNfc('ios')).toBe(false);
  });
});

describe('the probe', () => {
  it('never asks the radio on a platform that cannot use it', async () => {
    let asked = false;

    const answer = await canNfc(async () => {
      asked = true;
      return true;
    }, 'ios');

    expect(answer).toBe(false);
    expect(asked).toBe(false);
  });

  it('is true on Android with a working reader', async () => {
    await expect(canNfc(async () => true, 'android')).resolves.toBe(true);
  });

  it('is false on Android with no reader', async () => {
    await expect(canNfc(async () => false, 'android')).resolves.toBe(false);
  });

  it('is false rather than throwing when the module cannot answer', async () => {
    const broken = async () => {
      throw new Error('no native module');
    };

    await expect(canNfc(broken, 'android')).resolves.toBe(false);
  });
});
