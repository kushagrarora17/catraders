import type React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, type InteractivitySchema } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { bodyFont, colors, headingFont, LOGO_DROP, LOGO_TRIANGLE, LOGO_VIEWBOX } from "../brand";

type Props = {
  readonly tagline: string;
  readonly style?: React.CSSProperties;
};

const HookSceneInner: React.FC<Props> = ({ tagline, style }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: bodyFont, ...style }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <svg
          viewBox={LOGO_VIEWBOX}
          width={220}
          height={220}
          style={{
            scale: interpolate(frame, [0, 24], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
            rotate: interpolate(frame, [0, 24], ["-25deg", "0deg"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <path d={LOGO_TRIANGLE} fill={colors.gold} />
          <path
            d={LOGO_DROP}
            fill={colors.navyDark}
            style={{
              translate: interpolate(frame, [14, 34], ["0px -30px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.56, 0.64, 1),
              }),
              opacity: interpolate(frame, [14, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          />
        </svg>
        <div
          style={{
            marginTop: 36,
            fontFamily: headingFont,
            fontWeight: 800,
            fontSize: 150,
            letterSpacing: 4,
            lineHeight: 1,
            opacity: interpolate(frame, [22, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            translate: interpolate(frame, [22, 42], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <span style={{ color: colors.gold }}>CA </span>
          <span style={{ color: "#ffffff" }}>TRADERS</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: headingFont,
            fontWeight: 600,
            fontSize: 36,
            letterSpacing: 12,
            color: colors.slateLight,
            opacity: interpolate(frame, [34, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          AUTOMOTIVE LUBRICANTS &amp; FLUIDS
        </div>
        <div
          style={{
            marginTop: 70,
            fontFamily: headingFont,
            fontWeight: 700,
            fontSize: 84,
            color: "#ffffff",
            opacity: interpolate(frame, [62, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            scale: interpolate(frame, [62, 84], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 200 }),
              output: "perceptual-scale",
            }),
          }}
        >
          {tagline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const hookSchema = {
  tagline: { type: "text-content", default: "", description: "Tagline" },
} as const satisfies InteractivitySchema;

export const HookScene = Interactive.withSchema({
  Component: HookSceneInner,
  componentName: "<HookScene>",
  schema: hookSchema,
  wrapInSequence: true,
});
