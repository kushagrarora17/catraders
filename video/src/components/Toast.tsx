import type React from "react";
import { bodyFont, colors, headingFont } from "../brand";

type Props = {
  readonly title: string;
  readonly detail: string;
  readonly style?: React.CSSProperties;
};

export const Toast: React.FC<Props> = ({ title, detail, style }) => {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "22px 30px",
        borderRadius: 14,
        backgroundColor: colors.navy,
        border: `2px solid ${colors.gold}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        ...style,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.success,
          color: colors.navyDark,
          fontSize: 34,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: bodyFont,
        }}
      >
        ✓
      </div>
      <div>
        <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 36, color: "#ffffff", letterSpacing: 0.5 }}>{title}</div>
        <div style={{ fontFamily: bodyFont, fontSize: 24, color: colors.slateLight, marginTop: 2 }}>{detail}</div>
      </div>
    </div>
  );
};
