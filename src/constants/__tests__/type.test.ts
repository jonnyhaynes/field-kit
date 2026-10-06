import { describe, expect, it } from '@jest/globals';

import { FONTS } from '../fonts';
import { FontFamily, Type } from '../type';

describe('type roles', () => {
  it('only names fonts that are actually registered, or a role silently falls back to system', () => {
    const registered: readonly string[] = Object.keys(FONTS);
    for (const family of Object.values(FontFamily)) {
      expect(registered).toContain(family);
    }
  });

  it('never sets a font-weight, which on a single-weight family is a fake bold', () => {
    for (const role of Object.values(Type)) {
      expect(role).not.toHaveProperty('fontWeight');
    }
  });

  it('sets prose in the text face, labels in the strong text face, and headings in Bricolage', () => {
    expect(Type.body.fontFamily).toBe(FontFamily.text);
    expect(Type.note.fontFamily).toBe(FontFamily.text);
    expect(Type.label.fontFamily).toBe(FontFamily.textStrong);
    expect(Type.title.fontFamily).toBe(FontFamily.display);
    expect(Type.display.fontFamily).toBe(FontFamily.displayStrong);
  });

  it('gives the machine roles tabular figures and no size of their own', () => {
    expect(Type.machine.fontFamily).toBe(FontFamily.machine);
    expect(Type.machine.fontVariant).toContain('tabular-nums');
    expect(Type.machine).not.toHaveProperty('fontSize');
    expect(Type.machineStrong.fontFamily).toBe(FontFamily.machineStrong);
    expect(Type.machineStrong.fontVariant).toContain('tabular-nums');
    expect(Type.machineStrong).not.toHaveProperty('fontSize');
  });
});
