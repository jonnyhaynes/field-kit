import { Tabs, router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { type Depth } from '@/capture/depth';
import { useDepth } from '@/capture/use-depth';
import { TabBar } from '@/components/tab-bar';
import { TAB_LABELS, isTabVisible } from '@/navigation/tabs';

export default function TabsLayout() {
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
    /*
      The native bar is replaced wholesale rather than styled: the register needs a floating pill and
      a separate rounded container for the emergency action, and no `screenOptions` can express two
      objects where React Navigation has one.

      Order is fixed by these declarations, and every route in this directory renders as a tab
      whether or not it is declared — which is the trap worth naming. A *conditional*
      <Tabs.Screen> does not hide Field; it only drops its options, so the tab still appears with
      a default label and a default icon, appended to the end of the bar. It did exactly that at
      the guided depth, which is the thing §1 forbids. `href: null` is what removes it, and the bar
      checks the same gate again so a custom bar cannot regress it.
    */
    <Tabs tabBar={(props) => <TabBar state={props.state} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(act)" options={{ title: TAB_LABELS.act }} />
      <Tabs.Screen name="locate" options={{ title: TAB_LABELS.locate }} />
      <Tabs.Screen
        name="field"
        options={{ title: TAB_LABELS.field, href: fieldVisible ? undefined : null }}
      />
      <Tabs.Screen name="more" options={{ title: TAB_LABELS.more }} />
    </Tabs>
  );
}
