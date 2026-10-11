import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../brand";

type Props = {
  /** Frame(s), relative to the parent sequence, at which a click ripple fires. */
  readonly clickAt?: number | number[];
  readonly size?: number;
  readonly style?: React.CSSProperties;
};

/** Arrow cursor whose tip sits at the element's origin; position it with `translate`. */
export const Cursor: React.FC<Props> = ({ clickAt, size = 44, style }) => {
  const frame = useCurrentFrame();
  const clicks = clickAt === undefined ? [] : [clickAt].flat();
  const last = clicks.filter((c) => c <= frame).pop();
  const since = last === undefined ? -1 : frame - last;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, ...style }}>
      {since >= 0 && since < 18 ? (
        <div
          style={{
            position: "absolute",
            left: -size * 0.8,
            top: -size * 0.8,
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: "50%",
            border: `${size / 9}px solid ${colors.gold}`,
            scale: String(interpolate(since, [0, 18], [0.3, 1.4])),
            opacity: interpolate(since, [0, 18], [1, 0]),
          }}
        />
      ) : null}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          scale: String(since >= 0 && since < 6 ? 0.85 : 1),
          transformOrigin: "0 0",
          filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
        }}
      >
        <path d="M2 1 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.3 L17 13.3 Z" fill="#ffffff" stroke="#111d29" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
