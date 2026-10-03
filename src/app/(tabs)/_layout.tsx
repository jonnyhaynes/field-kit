import { Tabs, router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { type Depth } from '@/capture/depth';
import { useDepth } from '@/capture/use-depth';
import { TabGlyph } from '@/components/tab-glyph';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TAB_LABELS, TAB_ROUTE_NAMES, isTabVisible, visibleTabs } from '@/navigation/tabs';

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
      {visibleTabs(depth).map((tab) => (
        <Tabs.Screen
          key={tab}
          name={TAB_ROUTE_NAMES[tab]}
          options={{
            title: TAB_LABELS[tab],
            // Field is the depth's own tab, so it is marked rather than merely present.
            tabBarActiveTintColor:
              isTabVisible(depth, 'field') && tab === 'field' ? palette.accent : palette.text,
            tabBarIcon: ({ color }) => <TabGlyph id={tab} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
