import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SubTabs } from '@/components/sub-tabs';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { CompassScreen } from '@/locate/compass-screen';
import { MapScreen } from '@/locate/map-screen';
import { WhereScreen } from '@/locate/where-screen';

const TABS = [
  { id: 'map', label: 'Map' },
  { id: 'where', label: 'Where I am' },
  { id: 'compass', label: 'Compass' },
] as const;

type LocateTab = (typeof TABS)[number]['id'];

const isLocateTab = (value: unknown): value is LocateTab =>
  typeof value === 'string' && TABS.some((tab) => tab.id === value);

/**
 * Locate — the map, where I am, and the compass are **in-page tabs**, not destinations.
 *
 * They were three routes swapped with `router.replace`, which is navigation dressed as a tab: the
 * header changed, the transition played, and back had an opinion about it. They are three views of
 * one thing — where you are and which way you face — so the control swaps the pane in place and
 * navigation never hears about it.
 *
 * The panes keep their own `Screen`, which is why the tab row sits *above* one rather than inside
 * it: there is still exactly one scroll view and one dock on screen, and the tab row does not
 * scroll away with the content.
 *
 * A caller may name the pane it wants with a `tab` param — Act's "Where I am" tile, and the AED's
 * "Walk on a bearing". It initialises the pane and is re-read if it changes, so arriving from
 * elsewhere lands on the right view without turning the panes back into routes.
 */
export default function LocateScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<LocateTab>(() => (isLocateTab(params.tab) ? params.tab : 'map'));

  // Read the request on focus rather than in an effect: it is an arrival, not a piece of state to
  // mirror, so re-tapping the same tile after switching panes still lands on it.
  useFocusEffect(
    useCallback(() => {
      if (isLocateTab(params.tab)) setTab(params.tab);
    }, [params.tab]),
  );

  return (
    <View style={styles.root}>
      <View style={styles.centre}>
        <View style={styles.tabs}>
          <SubTabs tabs={TABS} active={tab} onChange={setTab} />
        </View>
      </View>

      {tab === 'map' ? (
        <MapScreen onOpenWhere={() => setTab('where')} onOpenCompass={() => setTab('compass')} />
      ) : tab === 'where' ? (
        <WhereScreen onOpenCompass={() => setTab('compass')} />
      ) : (
        <CompassScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Mirrors `Screen`, so the control lines up with the content it switches.
  centre: { flexDirection: 'row', justifyContent: 'center' },
  tabs: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
