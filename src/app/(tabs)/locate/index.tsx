import { useState } from 'react';
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
 */
export default function LocateScreen() {
  const [tab, setTab] = useState<LocateTab>('map');

  return (
    <View style={styles.root}>
      <View style={styles.centre}>
        <View style={styles.tabs}>
          <SubTabs tabs={TABS} active={tab} onChange={setTab} />
        </View>
      </View>

      {tab === 'map' ? (
        <MapScreen onOpenWhere={() => setTab('where')} />
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
