import { describe, expect, it } from '@jest/globals';

import { canQr, type CameraAvailability } from '../can-qr';

describe('the camera probe', () => {
  it('is true when the device says it has a camera', async () => {
    await expect(canQr(async () => true)).resolves.toBe(true);
  });

  it('is false when it says it has not', async () => {
    await expect(canQr(async () => false)).resolves.toBe(false);
  });

  it('is false rather than throwing when the question cannot be asked', async () => {
    const broken: CameraAvailability = async () => {
      throw new Error('no camera module');
    };

    await expect(canQr(broken)).resolves.toBe(false);
  });
});
