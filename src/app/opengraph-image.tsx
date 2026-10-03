import { ImageResponse } from "next/og";
import { BUSINESS_NAME, TAGLINE } from "@/features/site/contact";
import { LOGO_DROP, LOGO_GOLD, LOGO_NAVY, LOGO_TRIANGLE, LOGO_VIEWBOX } from "@/features/site/logo-paths";

export const alt = `${BUSINESS_NAME} — ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY_DARK = LOGO_NAVY;
const GOLD = LOGO_GOLD;
const OFF_WHITE = "#f8f7f4";
const SLATE = "#b4c0d0";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: NAVY_DARK,
          borderBottom: `16px solid ${GOLD}`,
          color: OFF_WHITE,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox={LOGO_VIEWBOX}>
            <path d={LOGO_TRIANGLE} fill={GOLD} />
            <path d={LOGO_DROP} fill={NAVY_DARK} />
          </svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: 2 }}>
            <span style={{ color: GOLD }}>CA</span>&nbsp;TRADERS
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48, fontSize: 84, fontWeight: 900, lineHeight: 1 }}>
          <span>PREMIUM</span>
          <span style={{ color: GOLD }}>LUBRICANTS</span>
          <span>&amp; FLUIDS</span>
        </div>
        <div style={{ marginTop: 40, fontSize: 30, color: SLATE }}>
          B2B wholesale for mechanics, auto shops &amp; dealerships across the GTA
        </div>
      </div>
    ),
    size,
  );
}
