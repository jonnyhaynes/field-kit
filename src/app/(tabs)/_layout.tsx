import { Tabs, router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { type Depth } from '@/capture/depth';
import { useDepth } from '@/capture/use-depth';
import { TabGlyph } from '@/components/tab-glyph';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TAB_LABELS, TAB_TEST_IDS, isTabVisible } from '@/navigation/tabs';

export default function TabsLayout() {
  const palette = Colors[useColorScheme()];
  const { depth } = useDepth();
  const pathname = usePathname();

  /**
   * Turning the depth off while standing on Field would leave the user on a tab that no longer
   * exists. This watches for that transition rather than for the state, because `useDepth` loads
   * its stored value asynchronously: acting on the state would redirect a responder away from their
   * own tab during the first render, before the stored depth had arrived.
   */
  const previousDepth = useRef<Depth | null>(null);
  useEffect(() => {
    const wasResponder = previousDepth.current === 'responder';
    if (wasResponder && depth === 'guided' && pathname.startsWith('/field')) {
      router.replace('/');
    }
    previousDepth.current = depth;
  }, [depth, pathname]);

  const fieldVisible = isTabVisible(depth, 'field');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: palette.backgroundElement,
          borderTopColor: palette.border,
        },
      }}>
      {/*
        Order is fixed by these declarations, and every route in this directory renders as a tab
        whether or not it is declared — which is the trap worth naming. A *conditional*
        <Tabs.Screen> does not hide Field; it only drops its options, so the tab still appears with
        a default label and a default icon, appended to the end of the bar. It did exactly that at
        the guided depth, which is the thing §1 forbids. `href: null` is what removes it, and it
        leaves the route resolvable so the redirect above still works.
      */}
      <Tabs.Screen
        name="(act)"
        options={{
          title: TAB_LABELS.act,
          tabBarButtonTestID: TAB_TEST_IDS.act,
          tabBarIcon: ({ color }) => <TabGlyph id="act" color={color} />,
        }}
      />
      <Tabs.Screen
        name="locate"
        options={{
          title: TAB_LABELS.locate,
          tabBarButtonTestID: TAB_TEST_IDS.locate,
          tabBarIcon: ({ color }) => <TabGlyph id="locate" color={color} />,
        }}
      />
      <Tabs.Screen
        name="field"
        options={{
          title: TAB_LABELS.field,
          tabBarButtonTestID: TAB_TEST_IDS.field,
          href: fieldVisible ? undefined : null,
          // Field is the depth's own tab, so it is marked rather than merely present.
          tabBarActiveTintColor: palette.accent,
          tabBarIcon: ({ color }) => <TabGlyph id="field" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: TAB_LABELS.more,
          tabBarButtonTestID: TAB_TEST_IDS.more,
          tabBarIcon: ({ color }) => <TabGlyph id="more" color={color} />,
        }}
      />
    </Tabs>
  );
}
