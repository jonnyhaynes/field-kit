import { type ColorValue, StyleSheet, View } from 'react-native';

import type { TabId } from '@/navigation/tabs';

/**
 * Tab marks, drawn rather than imported.
 *
 * The app ships no icon set, and four glyphs are not a reason to add one — these are geometry, so
 * they are Views. Each takes the colour the tab bar hands it, so the active state is the platform's
 * rather than a second thing to keep in sync.
 */
export function TabGlyph({ id, color }: { id: TabId; color: ColorValue }) {
  if (id === 'act') {
    return <View style={[styles.block, { backgroundColor: color }]} />;
  }

  if (id === 'locate') {
    // A diamond, which is a compass rose corner rather than a map pin — this tab is about where you
    // are and which way you face, not only about the map.
    return <View style={[styles.diamond, { borderColor: color }]} />;
  }

  if (id === 'field') {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((cell) => (
          <View key={cell} style={[styles.cell, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((dot) => (
        <View key={dot} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { width: 15, height: 15, borderRadius: 4 },
  diamond: {
    width: 13,
    height: 13,
    borderWidth: 2,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  grid: { width: 15, height: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  cell: { width: 6, height: 6, borderRadius: 2 },
  dots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
