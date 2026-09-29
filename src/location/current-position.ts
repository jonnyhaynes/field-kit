/**
 * The current position, for sorting by distance and nothing else.
 *
 * This is the narrow slice of Phase 3 that the AED list actually needs: a latitude and a
 * longitude. Grid references, the compass and what3words stay in Phase 3 proper.
 *
 * A position is used to sort a list and then discarded — it is not stored, and it is not
 * sent anywhere. `expo-location` is the only thing here, and it makes no network call.
 */

import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/aed';

export type PositionState =
  | { status: 'loading' }
  | { status: 'ready'; coordinates: Coordinates }
  | { status: 'denied' }
  | { status: 'unavailable' };

export function useCurrentPosition(): PositionState {
  const [state, setState] = useState<PositionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (permission.status !== 'granted') {
          setState({ status: 'denied' });
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        setState({
          status: 'ready',
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      } catch {
        // No fix, or no location provider at all. The screen says so rather than guessing.
        if (!cancelled) setState({ status: 'unavailable' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
