/**
 * The live heading, as the screen sees it.
 *
 * `watchHeadingAsync` gives a platform tilt-compensated heading and a calibration signal, which is
 * why this slice does not need the raw magnetometer — expo already does the rotation matrix, the
 * screen-orientation remap and, on Android, the declination.
 *
 * The capability probe runs first and is load-bearing: with no compass there is nothing to hear, so
 * we do not subscribe at all. That is the difference between "this device cannot do it" and "it
 * hasn't answered yet", and the two deserve different words on screen.
 *
 * The heading is read, not trusted. Whether it may be shown is `chooseCompassDisplay`'s decision.
 */

import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { canCompass } from '@/capabilities/can-compass';
import type { HeadingAccuracy, HeadingReading } from './heading';

export type HeadingState =
  { status: 'probing' } | { status: 'ready'; heading: HeadingReading } | { status: 'unsupported' };

function clampAccuracy(value: number): HeadingAccuracy {
  if (value <= 0) return 0;
  if (value >= 3) return 3;
  return Math.round(value) as HeadingAccuracy;
}

export function useHeading(): HeadingState {
  const [state, setState] = useState<HeadingState>({ status: 'probing' });

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    void (async () => {
      if (!(await canCompass())) {
        if (!cancelled) setState({ status: 'unsupported' });
        return;
      }
      if (cancelled) return;

      try {
        subscription = await Location.watchHeadingAsync((reading) => {
          if (cancelled) return;

          setState({
            status: 'ready',
            heading: {
              // Both platforms use a negative value to mean "cannot say".
              trueHeading: reading.trueHeading >= 0 ? reading.trueHeading : undefined,
              magneticHeading: reading.magHeading,
              accuracy: clampAccuracy(reading.accuracy),
            },
          });
        });

        // The effect may have been torn down while we awaited the subscription.
        if (cancelled) subscription.remove();
      } catch {
        if (!cancelled) setState({ status: 'unsupported' });
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return state;
}
