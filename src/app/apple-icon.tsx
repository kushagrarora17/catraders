import { ImageResponse } from "next/og";
import { LOGO_DROP, LOGO_GOLD, LOGO_NAVY, LOGO_TRIANGLE, LOGO_VIEWBOX } from "@/features/site/logo-paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS doesn't accept SVG touch icons and fills transparency with black, so use a solid navy tile.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: LOGO_NAVY }}>
        <svg width="120" height="120" viewBox={LOGO_VIEWBOX}>
          <path d={LOGO_TRIANGLE} fill={LOGO_GOLD} />
          <path d={LOGO_DROP} fill={LOGO_NAVY} />
        </svg>
      </div>
    ),
    size,
  );
}
