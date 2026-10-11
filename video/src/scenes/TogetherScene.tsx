import type React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, type InteractivitySchema } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { bodyFont, colors, headingFont, LOGO_DROP, LOGO_TRIANGLE, LOGO_VIEWBOX } from "../brand";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const ICONS = {
  customers: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM1 21c0-4 3-7 7-7s7 3 7 7Zm15.5 0c0-2.6-.9-4.9-2.4-6.4.6-.1 1.2-.1 1.9-.1 3.6 0 6 2.6 6 6.5Z",
  team: "M3 17.2V21h3.8L17.9 9.9l-3.8-3.8ZM20.7 7c.4-.4.4-1 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8Z",
  ai: "M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z",
};

type NodeProps = {
  readonly x: number;
  readonly y: number;
  readonly title: string;
  readonly detail: string;
  readonly icon?: keyof typeof ICONS;
  readonly start: number;
  readonly highlight?: boolean;
};

const Node: React.FC<NodeProps> = ({ x, y, title, detail, icon, start, highlight }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 400,
        height: 170,
        marginLeft: -200,
        marginTop: -85,
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 30px",
        boxSizing: "border-box",
        borderRadius: 16,
        backgroundColor: highlight ? colors.gold : colors.navy,
        border: `2px solid ${highlight ? colors.goldLight : "rgba(240,165,0,0.45)"}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        opacity: interpolate(frame, [start, start + 12], [0, 1], clamp),
        scale: interpolate(frame, [start, start + 18], [0.7, 1], {
          ...clamp,
          easing: Easing.spring({ damping: 14 }),
          output: "perceptual-scale",
        }),
      }}
    >
      <svg viewBox={icon ? "0 0 24 24" : LOGO_VIEWBOX} width={64} height={64} style={{ flexShrink: 0 }}>
        {icon ? (
          <path d={ICONS[icon]} fill={colors.gold} />
        ) : (
          <>
            <path d={LOGO_TRIANGLE} fill={colors.navyDark} />
            <path d={LOGO_DROP} fill={colors.gold} />
          </>
        )}
      </svg>
      <div>
        <div style={{ fontFamily: headingFont, fontWeight: 800, fontSize: 44, lineHeight: 1, color: highlight ? colors.navyDark : "#ffffff" }}>{title}</div>
        <div style={{ fontFamily: bodyFont, fontWeight: 500, fontSize: 24, marginTop: 8, color: highlight ? colors.navy : colors.slateLight }}>{detail}</div>
      </div>
    </div>
  );
};

type LinkProps = {
  readonly from: [number, number];
  readonly to: [number, number];
  readonly label: string;
  readonly start: number;
  readonly labelOffset?: [number, number];
};

const Link: React.FC<LinkProps> = ({ from, to, label, start, labelOffset = [0, -34] }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [start, start + 20], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const [x1, y1] = from;
  const x2 = x1 + (to[0] - x1) * progress;
  const y2 = y1 + (to[1] - y1) * progress;
  const dots = [0, 0.33, 0.66].map((o) => (((frame - start) / 45 + o) % 1 + 1) % 1);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.gold} strokeWidth={4} strokeDasharray="10 10" strokeOpacity={0.7} />
        {progress >= 1
          ? dots.map((t) => (
              <circle key={t} cx={x1 + (to[0] - x1) * t} cy={y1 + (to[1] - y1) * t} r={8} fill={colors.goldLight} />
            ))
          : null}
      </svg>
      <div
        style={{
          position: "absolute",
          left: (from[0] + to[0]) / 2 + labelOffset[0],
          top: (from[1] + to[1]) / 2 + labelOffset[1],
          translate: "-50% -50%",
          padding: "6px 16px",
          borderRadius: 8,
          backgroundColor: colors.navyDark,
          border: "1px solid rgba(240,165,0,0.35)",
          fontFamily: bodyFont,
          fontWeight: 600,
          fontSize: 26,
          color: colors.offWhite,
          whiteSpace: "nowrap",
          opacity: interpolate(frame, [start + 14, start + 24], [0, 1], clamp),
        }}
      >
        {label}
      </div>
    </>
  );
};

type Props = {
  readonly headline: string;
  readonly closing: string;
  readonly style?: React.CSSProperties;
};

const TogetherSceneInner: React.FC<Props> = ({ headline, closing, style }) => {
  const frame = useCurrentFrame();
  const diagramOut = interpolate(frame, [170, 185], [1, 0], clamp);
  const endIn = interpolate(frame, [180, 198], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ fontFamily: bodyFont, ...style }}>
      <Backdrop />
      <AbsoluteFill style={{ opacity: diagramOut }}>
        <div
          style={{
            position: "absolute",
            top: 100,
            width: "100%",
            textAlign: "center",
            fontFamily: headingFont,
            fontWeight: 800,
            fontSize: 96,
            textTransform: "uppercase",
            color: "#ffffff",
            opacity: interpolate(frame, [0, 15], [0, 1], clamp),
          }}
        >
          {headline}
        </div>
        <Link from={[500, 590]} to={[760, 590]} label="Request quotes" start={30} />
        <Link from={[1400, 415]} to={[1160, 545]} label="Publish instantly" start={50} labelOffset={[150, 15]} />
        <Link from={[1400, 765]} to={[1160, 635]} label="Update via MCP" start={70} labelOffset={[150, -15]} />
        <Node x={300} y={590} title="Customers" detail="Shops & mechanics" icon="customers" start={10} />
        <Node x={960} y={590} title="Your website" detail="Catalog + quotes, 24/7" start={18} highlight />
        <Node x={1560} y={330} title="Your team" detail="Studio + RFQ emails" icon="team" start={40} />
        <Node x={1560} y={860} title="Claude" detail="AI assistant via MCP" icon="ai" start={60} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: endIn }}>
        <svg
          viewBox={LOGO_VIEWBOX}
          width={170}
          height={170}
          style={{
            scale: interpolate(frame, [180, 205], [0.6, 1], {
              ...clamp,
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          <path d={LOGO_TRIANGLE} fill={colors.gold} />
          <path d={LOGO_DROP} fill={colors.navyDark} />
        </svg>
        <div style={{ marginTop: 30, fontFamily: headingFont, fontWeight: 800, fontSize: 140, letterSpacing: 4, lineHeight: 1 }}>
          <span style={{ color: colors.gold }}>CA </span>
          <span style={{ color: "#ffffff" }}>TRADERS</span>
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: headingFont,
            fontWeight: 700,
            fontSize: 84,
            color: "#ffffff",
            opacity: interpolate(frame, [200, 215], [0, 1], clamp),
          }}
        >
          {closing}
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: headingFont,
            fontWeight: 600,
            fontSize: 44,
            letterSpacing: 10,
            color: colors.gold,
            opacity: interpolate(frame, [215, 230], [0, 1], clamp),
          }}
        >
          LIVE NOW
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const togetherSchema = {
  headline: { type: "text-content", default: "", description: "Headline" },
  closing: { type: "text-content", default: "", description: "Closing line" },
} as const satisfies InteractivitySchema;

export const TogetherScene = Interactive.withSchema({
  Component: TogetherSceneInner,
  componentName: "<TogetherScene>",
  schema: togetherSchema,
  wrapInSequence: true,
});
