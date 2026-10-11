import type React from "react";
import { colors, bodyFont } from "../brand";

type Props = {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly dark?: boolean;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
};

export const BAR_HEIGHT = 44;

export const BrowserFrame: React.FC<Props> = ({ url, width, height, dark = true, children, style }) => {
  return (
    <div
      style={{
        position: "absolute",
        width,
        height: height + BAR_HEIGHT,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: dark ? "#0c141d" : "#ffffff",
        boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(240,165,0,0.25)",
        ...style,
      }}
    >
      <div
        style={{
          height: BAR_HEIGHT,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          backgroundColor: "#1a2430",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: c }} />
        ))}
        <div
          style={{
            marginLeft: 18,
            flex: 1,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#0f1720",
            color: colors.slateLight,
            fontFamily: bodyFont,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ position: "relative", width, height, overflow: "hidden" }}>{children}</div>
    </div>
  );
};
