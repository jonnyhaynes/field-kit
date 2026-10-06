import { type ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { TabId } from '@/navigation/tabs';

/**
 * Tab marks, from the Contour board.
 *
 * The app ships no icon set; these are the four shapes the board draws, at its 24-unit geometry.
 * They replaced a set of abstract Views (a block, a diamond, an ellipsis) that were ambiguous once
 * the bar went icon-only — the ECG line reads as "Act", the crosshair as "Locate", the clipboard as
 * "Field", and the ellipsis keeps "More". Each takes the colour the bar hands it, so the active
 * state stays the platform's rather than a second thing to keep in sync.
 */
export function TabGlyph({ id, color }: { id: TabId; color: ColorValue }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {id === 'act' ? (
        // Heavier than the others because it sits on the hi-vis disc, where a 2pt line is thin.
        <Path
          d="M3 12h4l2-5 4 10 2-5h6"
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {id === 'locate' ? (
        <>
          <Circle cx={12} cy={12} r={7} fill="none" stroke={color} strokeWidth={2} />
          <Path
            d="M12 2v4M12 18v4M2 12h4M18 12h4"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      ) : null}

      {id === 'field' ? (
        <>
          <Rect
            x={5}
            y={4}
            width={14}
            height={17}
            rx={3}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
          <Path
            d="M9 3h6v3H9zM9 12h6M9 16h4"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}

      {id === 'more' ? (
        <>
          <Circle cx={5} cy={12} r={1.8} fill={color} />
          <Circle cx={12} cy={12} r={1.8} fill={color} />
          <Circle cx={19} cy={12} r={1.8} fill={color} />
        </>
      ) : null}
    </Svg>
  );
}
