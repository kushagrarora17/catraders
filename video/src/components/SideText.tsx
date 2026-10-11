import type React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame, type InteractivitySchema } from "remotion";
import { bodyFont, colors, headingFont } from "../brand";

type HeadingProps = {
  readonly kicker: string;
  readonly children: string;
  readonly style?: React.CSSProperties;
};

const HeadingInner: React.FC<HeadingProps> = ({ kicker, children, style }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: 80,
        top: 110,
        width: 450,
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(frame, [0, 20], ["0px 30px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 3, backgroundColor: colors.gold }} />
        <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: colors.gold }}>{kicker}</div>
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: headingFont,
          fontWeight: 800,
          fontSize: 88,
          lineHeight: 0.95,
          textTransform: "uppercase",
          color: "#ffffff",
        }}
      >
        {children}
      </div>
    </Interactive.Div>
  );
};

const headingSchema = {
  kicker: { type: "text-content", default: "", description: "Kicker" },
  children: { type: "text-content", default: "", description: "Headline" },
} as const satisfies InteractivitySchema;

export const Heading = Interactive.withSchema({
  Component: HeadingInner,
  componentName: "<Heading>",
  schema: headingSchema,
  wrapInSequence: true,
});

type BulletProps = {
  readonly children: string;
  readonly style?: React.CSSProperties;
};

const BulletInner: React.FC<BulletProps> = ({ children, style }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: 80,
        width: 470,
        display: "flex",
        alignItems: "flex-start",
        gap: 18,
        fontFamily: bodyFont,
        fontWeight: 500,
        fontSize: 44,
        lineHeight: 1.1,
        color: colors.offWhite,
        opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(frame, [0, 16], ["-30px 0px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        ...style,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 14, width: 18, height: 18, rotate: "45deg", backgroundColor: colors.gold }} />
      <div>{children}</div>
    </Interactive.Div>
  );
};

const bulletSchema = {
  children: { type: "text-content", default: "", description: "Text" },
} as const satisfies InteractivitySchema;

export const Bullet = Interactive.withSchema({
  Component: BulletInner,
  componentName: "<Bullet>",
  schema: bulletSchema,
  wrapInSequence: true,
});
