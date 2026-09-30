import { StyleSheet, Text, View } from 'react-native';

import { AED_ATTRIBUTION, AED_LICENCE_URL } from '@/aed';
import { Screen } from '@/components/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseRegionsCatalogue } from '@/maps/regions';
import catalogueJson from '../../assets/maps/regions.json';

/**
 * Where the app says where its data comes from.
 *
 * Two jobs. The licences require attribution to be reachable, not just present in a corner of
 * a screen; and this is where the ODbL share-alike position is stated plainly rather than
 * left implicit in a source file.
 */

const PROTOTMAPS_URL = 'https://protomaps.com';

/**
 * Taken from the catalogue rather than written out here.
 *
 * The licence is recorded per pack, so it travels with the data instead of depending on somebody
 * remembering this screen exists. If a pack ever ships under different terms, this says so on its
 * own — and the fallback keeps the screen honest when there are no packs in the build at all.
 */
const packLicenceUrl =
  parseRegionsCatalogue(catalogueJson).packs[0]?.licence.url ?? AED_LICENCE_URL;

export default function AboutScreen() {
  const theme = useTheme();

  return (
    <Screen testID="about-screen">
      <Text style={[styles.title, { color: theme.text }]}>Data and licences</Text>

      <Section
        title="Defibrillators"
        body={`${AED_ATTRIBUTION}, under the Open Database License. Extracted from OpenStreetMap and shipped inside the app, so the list works offline.`}
        link={{ label: 'OpenStreetMap copyright and licence', url: AED_LICENCE_URL }}
      />

      <Section
        title="Map"
        body={`Basemap tiles by Protomaps, derived from OpenStreetMap and Natural Earth (${PROTOTMAPS_URL}). Bundled at low detail so the map is never blank, with full attribution in the map's own information button.`}
        link={{ label: 'Protomaps', url: PROTOTMAPS_URL }}
      />

      <Section
        title="Region packs"
        body="Downloads cut from the same Protomaps archive as the bundled map, for one area at higher detail. The same OpenStreetMap data under the same licence, stored on your device and deleted from the Region packs screen whenever you like."
        link={{ label: 'OpenStreetMap copyright and licence', url: packLicenceUrl }}
      />

      <Section
        title="Map lettering and icons"
        body="Noto Sans glyphs under the SIL Open Font License; map icons derived from tangrams/icons under the MIT licence."
      />

      <Section
        title="What this app does not do"
        body="It does not diagnose, it does not decide treatment, and it does not check that any defibrillator exists, is reachable, or is working. It reproduces reference guidance, cites where it came from, and records what you observe."
      />

      <Text style={[styles.footnote, { color: theme.textSecondary }]}>
        OpenStreetMap data is offered here under the Open Database License, which also covers any
        derived database: the shipped defibrillator database is a derivative of OpenStreetMap and is
        offered on the same terms, and so is every region pack — each is published as a file anyone
        can download, which is where that offer is made.
      </Text>
    </Screen>
  );
}

function Section({
  title,
  body,
  link,
}: {
  title: string;
  body: string;
  link?: { label: string; url: string };
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      {link ? (
        // Stated rather than linked: opening a browser is a network action, and this screen
        // must make sense with no signal.
        <Text style={[styles.link, { color: theme.text }]}>
          {link.label}: {link.url}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  link: { fontSize: 13, lineHeight: 18 },
  footnote: { fontSize: 12, lineHeight: 17 },
});
