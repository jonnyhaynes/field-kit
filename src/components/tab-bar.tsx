import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDepth } from '@/capture/use-depth';
import { CallBeacon } from '@/components/call-beacon';
import { TabGlyph } from '@/components/tab-glyph';
import { hairline } from '@/constants/surface';
import { Colors, Elevation, MinTarget, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TAB_LABELS, TAB_TEST_IDS, isTabVisible, type TabId } from '@/navigation/tabs';

/**
 * The bottom bar: one pill, and the emergency action at the thumb end of it.
 *
 * The violet register drew two objects — a nav pill and a separate round red button beside it. That
 * separation read as "call" being a peer of "More", which is the one thing it must not be; Contour
 * puts 999 *inside* the pill as a red capsule, last, where the thumb already rests, and it is still
 * the only red on the screen.
 *
 * The pill is **ink in both schemes**, so it is the one surface that does not follow the theme, and
 * its glyphs take the dark scheme's light inks even under light. The tabs are **icon-only** (the
 * board's design) — their names survive as accessibility labels — which is why the pill fits at 74pt.
 *
 * **On a capture form the bar stands down entirely** (the board's ABCDE screen). The form draws its
 * own bar — Previous, Next and the same beacon — so the tabs are not a way out mid-form, and there is
 * still exactly one emergency action on screen. The form supplies its own bottom inset, because this
 * bar is no longer there to own it.
 *
 * The bar is a normal (not overlaid) tab bar with a transparent strip, so React Navigation measures
 * it and no screen has to reserve space for an overlay.
 */

/** Route names to the tab ids the app reasons in. */
const ROUTE_TO_TAB: Record<string, TabId> = {
  '(act)': 'act',
  locate: 'locate',
  field: 'field',
  more: 'more',
};

/** Where each tab lives. Act is served from a route group, so it stays at the root. */
const TAB_PATH: Record<TabId, '/' | '/locate' | '/field' | '/more'> = {
  act: '/',
  locate: '/locate',
  field: '/field',
  more: '/more',
};

/**
 * Only the fields this bar actually reads. Declaring a subset rather than importing the navigator's
 * own props type keeps it assignable (the real props are a superset) and avoids reaching into
 * expo-router's vendored react-navigation internals, which are not a public import.
 */
type TabBarProps = {
  state: { index: number; routes: readonly { key: string; name: string }[] };
};

export function TabBar({ state }: TabBarProps) {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { depth } = useDepth();
  const pathname = usePathname();

  // A capture form draws its own bar; see the note above.
  if (pathname === '/field/form') return null;

  // The pill is ink in both schemes; a couple of things must therefore borrow the dark ink, not the
  // live scheme's text colours, or they vanish into the pill under light.
  const dark = Colors.dark;

  return (
    <View style={[styles.strip, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
      <View
        style={[
          styles.pill,
          { backgroundColor: Colors[scheme].bar, borderColor: Colors[scheme].border },
          Elevation[scheme].control,
        ]}>
        {state.routes.map((route, index) => {
          const id = ROUTE_TO_TAB[route.name];
          // §1 enforced here as well as by `href: null`: depth *adds* a tab, and a bar that rendered
          // a route the depth hides would put capture in front of an untrained user.
          if (!id || !isTabVisible(depth, id)) return null;

          const focused = state.index === index;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={TAB_LABELS[id]}
              testID={TAB_TEST_IDS[id]}
              onPress={() => {
                if (!focused) router.navigate(TAB_PATH[id]);
              }}
              style={[styles.item, focused && { backgroundColor: Colors[scheme].brand }]}>
              <TabGlyph id={id} color={focused ? dark.brandInk : dark.textSecondary} />
            </Pressable>
          );
        })}

        <CallBeacon />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  pill: {
    height: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 37,
    borderWidth: hairline,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two + Spacing.half,
  },
  item: {
    width: MinTarget,
    height: MinTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
