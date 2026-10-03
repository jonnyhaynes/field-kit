import { describe, expect, it } from '@jest/globals';

import { TAB_LABELS, TAB_ROUTE_NAMES, isTabVisible, visibleTabs } from '../tabs';

describe('the tab set', () => {
  it('is three tabs when the depth is guided', () => {
    expect(visibleTabs('guided')).toEqual(['act', 'locate', 'more']);
  });

  it('adds Field at the responder depth and moves nothing else', () => {
    const guided = visibleTabs('guided');
    const responder = visibleTabs('responder');

    expect(responder).toEqual(['act', 'locate', 'field', 'more']);

    // This is §1 as an assertion: the responder depth *adds*. Removing the tab it adds has to leave
    // the guided order exactly as it was, so nothing already on screen moves when the switch is
    // thrown. A layout that reordered the tabs would fail here rather than in review.
    expect(responder.filter((tab) => tab !== 'field')).toEqual(guided);
  });

  it('answers whether a tab exists at a depth', () => {
    expect(isTabVisible('responder', 'field')).toBe(true);
    expect(isTabVisible('guided', 'field')).toBe(false);
    expect(isTabVisible('guided', 'act')).toBe(true);
  });

  it('gives every tab both a route name and a label', () => {
    // A tab with no label renders as a blank in the bar, which is a silent failure rather than a
    // loud one, so it is worth a test.
    for (const tab of visibleTabs('responder')) {
      expect(TAB_ROUTE_NAMES[tab]).toBeTruthy();
      expect(TAB_LABELS[tab]).toBeTruthy();
    }
  });

  it('keeps Act served from the route group, so Act and CPR are still / and /cpr', () => {
    // The two screens that matter most must not move when the app gains tabs.
    expect(TAB_ROUTE_NAMES.act).toBe('(act)');
  });
});
