import type React from "react";
import { colors } from "../brand";

type Props = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly thickness?: number;
  readonly style?: React.CSSProperties;
};

/** Gold outline around a region of a screenshot, in screenshot pixels. */
export const Highlight: React.FC<Props> = ({ x, y, w, h, thickness = 4, style }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 10,
        border: `${thickness}px solid ${colors.gold}`,
        boxShadow: `0 0 0 ${thickness * 2}px rgba(240,165,0,0.22), 0 0 40px rgba(240,165,0,0.45)`,
        ...style,
      }}
    />
  );
};
