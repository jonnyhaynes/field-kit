/**
 * Direction of travel, for when there is no usable magnetometer.
 *
 * This is a course, not a compass: it only knows where you have been going. It is also the more
 * dangerous of the two readings, because on Android a stationary device reports `bearing = 0`, due
 * north — expo never checks `hasBearing()` — and there is no way to tell that apart from genuinely
 * facing north. So the speed gate in `chooseCompassDisplay` is not a nicety, it is the thing that
 * stops a standing phone claiming to point north.
 *
 * iOS uses a negative value for an unusable course; Android uses the same `0` it uses for a real
 * bearing, which is why the gate is on speed rather than on the reading.
 */

import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { CourseReading } from './heading';

export function useCourse(): CourseReading | undefined {
  const [course, setCourse] = useState<CourseReading | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 2_000, distanceInterval: 0 },
      (position) => {
        if (cancelled) return;

        const { heading, speed } = position.coords;
        setCourse(
          heading !== null && speed !== null && heading >= 0 && Number.isFinite(speed)
            ? { degrees: heading, speedMetresPerSecond: speed }
            : undefined,
        );
      },
    )
      .then((value) => {
        subscription = value;
        if (cancelled) value.remove();
      })
      .catch(() => {
        // No positions at all means no course; the screen already has a state for that.
        if (!cancelled) setCourse(undefined);
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return course;
}
