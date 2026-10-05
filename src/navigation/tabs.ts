import type { Depth } from '@/capture/depth';

export type TabId = 'act' | 'locate' | 'field' | 'more';

/**
 * The tabs, in the order they always appear.
 *
 * §1: depth *adds* tools and never moves them. The responder depth inserts Field and leaves the
 * other three exactly where they are, so the order lives here once and `visibleTabs` is the only way
 * to get the list. That makes "adds, never moves" something a test can assert rather than something
 * a reviewer has to notice in a layout.
 */
const ORDER: readonly TabId[] = ['act', 'locate', 'field', 'more'];

export function visibleTabs(depth: Depth): readonly TabId[] {
  return depth === 'responder' ? ORDER : ORDER.filter((tab) => tab !== 'field');
}

/** Whether a tab exists at this depth — the question the Field-tab redirect needs answered. */
export function isTabVisible(depth: Depth, tab: TabId): boolean {
  return visibleTabs(depth).includes(tab);
}

/**
 * The Expo Router route name for each tab.
 *
 * Act is served from a route *group*, `(act)`, which does not appear in the URL — so Act stays at
 * `/` and CPR stays at `/cpr`, and turning the app into tabs does not move the two screens that
 * matter most.
 */
export const TAB_ROUTE_NAMES: Record<TabId, string> = {
  act: '(act)',
  locate: 'locate',
  field: 'field',
  more: 'more',
};

export const TAB_LABELS: Record<TabId, string> = {
  act: 'Act',
  locate: 'Locate',
  field: 'Field',
  more: 'More',
};

/**
 * Test ids for the tab buttons.
 *
 * These exist so a flow can select a tab by id rather than by its visible label, and — the reason
 * they earn their place — so a flow can assert the *order* with a relative selector. "Depth adds,
 * never moves" is a claim about position, and a test that only counted tabs would not catch a bar
 * that gained Field and quietly reordered the rest.
 */
export const TAB_TEST_IDS: Record<TabId, string> = {
  act: 'tab-act',
  locate: 'tab-locate',
  field: 'tab-field',
  more: 'tab-more',
};
