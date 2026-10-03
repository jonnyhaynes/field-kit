import { Stack, router, usePathname } from 'expo-router';

import { SubTabHeader } from '@/components/sub-tab-header';

const TABS = [
  { id: 'map', label: 'Map' },
  { id: 'where', label: 'Where I am' },
  { id: 'compass', label: 'Compass' },
] as const;

type LocateTab = (typeof TABS)[number]['id'];

/** Written out rather than composed, so typed routes can see the literal paths. */
const HREFS = {
  map: '/locate',
  where: '/locate/where',
  compass: '/locate/compass',
} as const;

function activeTab(pathname: string): LocateTab {
  if (pathname.startsWith('/locate/where')) return 'where';
  if (pathname.startsWith('/locate/compass')) return 'compass';
  // Region packs is pushed from the map, so the map stays the current sub-tab underneath it.
  return 'map';
}

function LocateHeader() {
  const pathname = usePathname();

  return (
    <SubTabHeader
      title="Locate"
      tabs={TABS}
      active={activeTab(pathname)}
      onChange={(id) => router.replace(HREFS[id])}
    />
  );
}

/**
 * Locate: the map, where I am, and the compass are sub-tabs of one place rather than three
 * destinations, so the map is always one tap away instead of a back button.
 *
 * Region packs keeps a native header, because it is pushed *from* the map rather than being a peer
 * of it, and needs the back affordance.
 */
export default function LocateLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ header: () => <LocateHeader /> }} />
      <Stack.Screen name="where" options={{ header: () => <LocateHeader /> }} />
      <Stack.Screen name="compass" options={{ header: () => <LocateHeader /> }} />
      <Stack.Screen name="regions" options={{ title: 'Region packs' }} />
    </Stack>
  );
}
