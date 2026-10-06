/**
 * The type roles.
 *
 * Named by the job they do rather than by their size, so a screen asks for `label` instead of
 * restating a size and a weight that will then drift from every other screen's copy of it.
 *
 * The split that matters is `machine`: **words in Figtree, measured values in IBM Plex Mono.** Grid
 * references, coordinates, distances, bearings, the metronome rate and a what3words location go
 * through it and nothing else does — that distinction is the reason there are two families at all,
 * and applying it inconsistently would lose the point of the choice. Bricolage Grotesque carries the
 * display and title lines only, where its character reads; the plain Figtree does the reading.
 *
 * Both faces are bundled subsets rather than foundry originals; `scripts/build-fonts.sh` is the
 * pipeline, and the names below must match the keys registered in `src/constants/fonts.ts` — the test
 * beside this file asserts they do, because a renamed font falls back to the system face silently.
 */

import type { TextStyle } from 'react-native';

export const FontFamily = {
  /** Bricolage Grotesque 700 — titles and the display line at one scale below. */
  display: 'BricolageGrotesque-700',
  /** Bricolage Grotesque 800 — the display face proper. A second instance, so a second key. */
  displayStrong: 'BricolageGrotesque-800',
  /** Figtree Regular — everything a person reads. */
  text: 'Figtree-Regular',
  /** Figtree SemiBold — labels and the strong end of running text. */
  textStrong: 'Figtree-SemiBold',
  /**
   * IBM Plex Mono — measured values only.
   *
   * Monospaced, so figures line up in a column without anyone asking them to, which is most of why
   * a readout looks like an instrument rather than like a sentence.
   */
  machine: 'IBMPlexMono-Regular',
  /** IBM Plex Mono Medium — a readout that is the subject of its panel rather than a small value. */
  machineStrong: 'IBMPlexMono-Medium',
} as const;

export const Type = {
  /** A screen's own heading, and the hero line on Act. */
  display: {
    fontFamily: FontFamily.displayStrong,
    fontSize: 32,
    lineHeight: 33,
    letterSpacing: -0.9,
  } as TextStyle,

  /** A card or row heading. */
  title: {
    fontFamily: FontFamily.display,
    fontSize: 20,
  } as TextStyle,

  /** Prose. The measure is held by the layout, not here. */
  body: {
    fontFamily: FontFamily.text,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,

  /**
   * A caption or note — the small second voice under a value, a citation, an attribution.
   *
   * The roles were originally five, but the app has a large class of 12–13px secondary text that is
   * neither `body` nor `label`. Naming it here keeps that size from being restated, and drifting,
   * on every screen that has a footnote.
   */
  note: {
    fontFamily: FontFamily.text,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  /** An etched marker above a value — the small-caps line on a panel. */
  label: {
    fontFamily: FontFamily.textStrong,
    fontSize: 10.5,
    letterSpacing: 1.68,
    textTransform: 'uppercase',
  } as TextStyle,

  /**
   * A measured value.
   *
   * Deliberately carries no size: a grid reference, a distance and a bearing are not the same size on
   * screen, and fixing one here would force every caller to override it. Callers set `fontSize`; this
   * carries the family and the tabular figures.
   */
  machine: {
    fontFamily: FontFamily.machine,
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  /** A measured value that leads its panel — the medium weight, without the size. */
  machineStrong: {
    fontFamily: FontFamily.machineStrong,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;
