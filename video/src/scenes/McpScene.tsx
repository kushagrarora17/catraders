import type React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame } from "../components/BrowserFrame";
import { Highlight } from "../components/Highlight";
import { Shot } from "../components/Shot";
import { Bullet, Heading } from "../components/SideText";
import { bodyFont, colors, headingFont } from "../brand";

const W = 1240;
const H = 697;

const chat = {
  bg: "#1f1e1d",
  bubble: "#2f2e2b",
  text: "#ece9e1",
  muted: "#a29f97",
  accent: "#d97757",
};

const appear = (frame: number, start: number) =>
  interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const typed = (text: string, frame: number, start: number, end: number) =>
  text.slice(0, Math.round(interpolate(frame, [start, end], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

const UserBubble: React.FC<{ children: string }> = ({ children }) => (
  <div
    style={{
      alignSelf: "flex-end",
      maxWidth: 600,
      padding: "16px 22px",
      borderRadius: 18,
      backgroundColor: chat.bubble,
      color: chat.text,
      fontSize: 26,
      lineHeight: 1.35,
      minHeight: 35,
    }}
  >
    {children}
  </div>
);

const ToolChip: React.FC<{ tool: string; start: number; doneAt: number }> = ({ tool, start, doneAt }) => {
  const frame = useCurrentFrame();
  const done = frame >= doneAt;
  return (
    <div
      style={{
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 18px",
        borderRadius: 12,
        border: `1.5px solid ${done ? colors.gold : "#4a4844"}`,
        color: chat.muted,
        fontSize: 22,
        opacity: appear(frame, start),
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 800,
          backgroundColor: done ? colors.gold : "transparent",
          color: colors.navyDark,
          border: done ? "none" : `3px solid ${chat.accent}`,
          borderTopColor: done ? undefined : "transparent",
          rotate: done ? "0deg" : `${frame * 18}deg`,
        }}
      >
        {done ? "✓" : ""}
      </div>
      <span>
        catraders · <span style={{ color: chat.text, fontFamily: "monospace" }}>{tool}</span>
      </span>
    </div>
  );
};

const AnswerLine: React.FC<{ start: number; children: React.ReactNode }> = ({ start, children }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        opacity: appear(frame, start),
        translate: interpolate(frame, [start, start + 12], ["0px 12px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      {children}
    </div>
  );
};

type Props = {
  readonly headline: string;
  readonly style?: React.CSSProperties;
};

const McpSceneInner: React.FC<Props> = ({ headline, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily: bodyFont, ...style }}>
      <Backdrop />
      <Heading name="Heading" kicker="03 · YOUR AI ASSISTANT" premountFor={fps}>
        {headline}
      </Heading>
      <Bullet name="Bullet plain english" from={0.4 * fps} premountFor={fps} style={{ top: 470 }}>
        Ask in plain English
      </Bullet>
      <Bullet name="Bullet bulk" from={4 * fps} premountFor={fps} style={{ top: 595 }}>
        Bulk stock &amp; CSV imports
      </Bullet>
      <Bullet name="Bullet reviews" from={7.4 * fps} premountFor={fps} style={{ top: 720 }}>
        Manage reviews &amp; categories
      </Bullet>
      <Bullet name="Bullet quotes" from={10 * fps} premountFor={fps} style={{ top: 845 }}>
        Track quote requests
      </Bullet>

      <BrowserFrame
        url="Claude  ·  catraders connector"
        width={W}
        height={H}
        style={{
          left: 600,
          top: 170,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [0, 25], ["80px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <AbsoluteFill style={{ backgroundColor: chat.bg }} />
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 32,
            width: 760,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            color: chat.text,
            fontFamily: bodyFont,
          }}
        >
          <UserBubble>{typed("Which Castrol EDGE 5W-30 oils do we carry? Are they in stock?", frame, 8, 50)}</UserBubble>
          {frame >= 60 ? <ToolChip tool="search_products" start={60} doneAt={85} /> : null}
          {frame >= 92 ? (
            <div style={{ fontSize: 25, lineHeight: 1.4 }}>
              <AnswerLine start={92}>We carry two, and both are in stock:</AnswerLine>
              <AnswerLine start={104}>
                • <b>Castrol EDGE 5W-30</b>, 3 × 5 L (API SP, dexos1 Gen 3)
              </AnswerLine>
              <AnswerLine start={116}>
                • <b>Castrol EDGE Euro 5W-30</b>, 3 × 5 L (ACEA A3/B4, VW 502/505)
              </AnswerLine>
            </div>
          ) : null}
          {frame >= 165 ? <UserBubble>{typed("Mark the Euro one out of stock.", frame, 168, 195)}</UserBubble> : null}
          {frame >= 205 ? <ToolChip tool="set_stock" start={205} doneAt={230} /> : null}
          {frame >= 238 ? (
            <div style={{ fontSize: 25, lineHeight: 1.4 }}>
              <AnswerLine start={238}>Done. Castrol EDGE Euro 5W-30 now shows “Out of stock” on the website.</AnswerLine>
              <AnswerLine start={252}>Customers can still view it, but can’t add it to a quote.</AnswerLine>
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: "absolute",
            left: 850,
            top: 60,
            width: 350,
            opacity: appear(frame, 270),
            translate: interpolate(frame, [270, 290], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: colors.gold, marginBottom: 14 }}>
            LIVE ON YOUR WEBSITE
          </div>
          <div style={{ position: "relative", width: 338, height: 418, overflow: "hidden", borderRadius: 6 }}>
            <Shot src="shots/catalog.png" imgWidth={1920} imgHeight={1080} viewWidth={1728} style={{ translate: "-1183px -241px" }}>
              {frame >= 300 ? (
                <>
                  <div style={{ position: "absolute", left: 1326, top: 692, width: 70, height: 30, backgroundColor: colors.navyDark }} />
                  <div
                    style={{
                      position: "absolute",
                      left: 1329,
                      top: 694,
                      padding: "3px 8px",
                      borderRadius: 3,
                      backgroundColor: colors.destructive,
                      color: colors.navyDark,
                      fontFamily: bodyFont,
                      fontWeight: 600,
                      fontSize: 15,
                      scale: interpolate(frame, [300, 312], [0.4, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                      }),
                    }}
                  >
                    Out of stock
                  </div>
                  <Highlight x={1318} y={684} w={110} h={44} thickness={3} style={{ opacity: appear(frame, 310) }} />
                </>
              ) : null}
            </Shot>
          </div>
        </div>
      </BrowserFrame>
    </AbsoluteFill>
  );
};

const mcpSchema = {
  headline: { type: "text-content", default: "", description: "Headline" },
} as const satisfies InteractivitySchema;

export const McpScene = Interactive.withSchema({
  Component: McpSceneInner,
  componentName: "<McpScene>",
  schema: mcpSchema,
  wrapInSequence: true,
});
