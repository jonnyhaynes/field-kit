/**
 * The handover the send screen is about to produce.
 *
 * One hook for both depths, because the difference is what goes in rather than what happens: a
 * responder sends the report they have been filling in, and a Guided user sends where they are and
 * what they can type in one box. Both end at the same payload, serialised the same way.
 */

import { useMemo, useState } from 'react';

import type { Depth } from '@/capture/depth';
import { useDepth } from '@/capture/use-depth';
import { recordedFrom, type RecordedLocation } from '@/incident/recorded-location';
import { useCurrentPosition } from '@/location/current-position';
import { useCurrentReport } from '@/report/use-report';

import {
  compactHandover,
  describeHandover,
  fitsInCode,
  guidedDraft,
  responderDraft,
  serialiseHandover,
  type HandoverDraft,
  type HandoverPayload,
} from './handover';

export type Handover = {
  depth: Depth;
  /** Guided's one box, and unused by a responder. */
  note: string;
  setNote: (note: string) => void;
} & (
  | { status: 'empty' }
  | {
      status: 'ready';
      payload: HandoverPayload;
      /** What goes in the code, or null when the report is too large to draw one. */
      code: string | null;
      /** The same report as text, for the share sheet and for the too-large fallback. */
      text: string;
    }
);

export function useHandover(): Handover {
  const { depth } = useDepth();
  const { report } = useCurrentReport();
  const position = useCurrentPosition();
  const [note, setNote] = useState('');

  // Fixed when the screen opens. A payload whose timestamp moved while it was being read would be a
  // payload nobody could check against anything.
  const [sentAt] = useState(() => new Date().toISOString());

  const latitude = position.status === 'ready' ? position.coordinates.latitude : undefined;
  const longitude = position.status === 'ready' ? position.coordinates.longitude : undefined;

  /**
   * Guided has no stored report, so the position taken now becomes a **recorded** one, at the moment
   * the fix arrived — never a live one, because it is about to leave the device and be read by
   * somebody who is not standing here (§4.1 rule 1).
   */
  const guidedLocation = useMemo<RecordedLocation | undefined>(
    () =>
      latitude === undefined || longitude === undefined
        ? undefined
        : recordedFrom({ latitude, longitude }, new Date().toISOString()),
    [latitude, longitude],
  );

  const draft = useMemo<HandoverDraft | undefined>(() => {
    if (depth === 'responder') {
      // A responder sends their report, so there has to be one.
      return report ? responderDraft(report, sentAt) : undefined;
    }

    return guidedDraft({ note, location: guidedLocation, sentAt });
  }, [depth, report, note, guidedLocation, sentAt]);

  if (!draft) return { status: 'empty', depth, note, setNote };

  const payload = compactHandover(draft);
  const serialised = serialiseHandover(payload);

  return {
    status: 'ready',
    depth,
    payload,
    code: fitsInCode(serialised) ? serialised : null,
    text: describeHandover(payload),
    note,
    setNote,
  };
}
