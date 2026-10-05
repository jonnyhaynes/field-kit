import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { bevelStyle, hairline, raisedSurface } from '@/constants/surface';
import { Bevel, Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { beatIntervalMs } from '@/cpr/pace';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Comes from licensed guidance. Never a number this app chose. */
  bpm: number;
  testID?: string;
};

/**
 * Visual pace setter. No audio, no haptics yet — both need a device to verify, and the
 * pace itself is dormant until the compression-rate record is licensed in.
 */
export function Metronome({ bpm, testID = 'metronome' }: Props) {
  const scheme = useColorScheme();
  const theme = useTheme();
  const [beats, setBeats] = useState(0);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    // Beat only. No state reset in here: setting state synchronously in an effect causes a
    // cascading render, and letting the count carry over is harmless for a pace that does
    // not change mid-incident.
    const id = setInterval(() => {
      setBeats((n) => n + 1);
      setLit((on) => !on);
    }, beatIntervalMs(bpm));
    return () => clearInterval(id);
  }, [bpm]);

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Compression pace, ${bpm} per minute, ${beats} beats so far`}
      style={[styles.wrap, raisedSurface(scheme)]}>
      <View pointerEvents="none" style={bevelStyle(Bevel[scheme], Radius.md)} />
      <View
        style={[styles.dot, { backgroundColor: lit ? theme.brand : Surfaces[scheme].selected }]}
      />
      <Text style={[styles.rate, { color: theme.text }]}>{bpm}</Text>
      <Text style={[styles.caption, { color: theme.textSecondary }]}>per minute</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: { width: 28, height: 28, borderRadius: Radius.pill },
  rate: { ...Type.machine, fontSize: 46 },
  caption: { ...Type.note },
});
