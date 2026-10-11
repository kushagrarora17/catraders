import type React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, Sequence, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame } from "../components/BrowserFrame";
import { Cursor } from "../components/Cursor";
import { Highlight } from "../components/Highlight";
import { Shot } from "../components/Shot";
import { Bullet, Heading } from "../components/SideText";
import { Toast } from "../components/Toast";
import { bodyFont, colors, SITE_URL } from "../brand";

const W = 1240;
const H = 697;

const typed = (text: string, frame: number, start: number, end: number) =>
  text.slice(0, Math.round(interpolate(frame, [start, end], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

const FieldText: React.FC<{ x: number; y: number; children: string }> = ({ x, y, children }) => (
  <div style={{ position: "absolute", left: x + 12, top: y + 7, fontFamily: bodyFont, fontSize: 17, color: colors.offWhite }}>{children}</div>
);

type Props = {
  readonly headline: string;
  readonly style?: React.CSSProperties;
};

const CustomerSceneInner: React.FC<Props> = ({ headline, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily: bodyFont, ...style }}>
      <Backdrop />
      <Heading name="Heading" kicker="01 · YOUR CUSTOMERS" premountFor={fps}>
        {headline}
      </Heading>
      <Bullet name="Bullet browse" from={0.4 * fps} premountFor={fps} style={{ top: 470 }}>
        Browse 200+ products
      </Bullet>
      <Bullet name="Bullet filter" from={3.4 * fps} premountFor={fps} style={{ top: 595 }}>
        Filter by brand &amp; spec
      </Bullet>
      <Bullet name="Bullet quote list" from={7.4 * fps} premountFor={fps} style={{ top: 720 }}>
        Build a quote list
      </Bullet>
      <Bullet name="Bullet request" from={11.4 * fps} premountFor={fps} style={{ top: 845 }}>
        Request a quote in one click
      </Bullet>

      <BrowserFrame
        url={SITE_URL}
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
        <Sequence name="Home" durationInFrames={110} premountFor={fps}>
          <Shot
            src="shots/home-hero.png"
            imgWidth={1920}
            imgHeight={1080}
            viewWidth={W}
            style={{
              scale: interpolate(frame, [0, 100], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: interpolate(frame, [0, 100], ["0px 0px", "-37px -21px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          />
        </Sequence>

        <Sequence name="Catalog" from={100} durationInFrames={130} premountFor={fps}>
          <Shot
            src="shots/catalog.png"
            imgWidth={1920}
            imgHeight={1080}
            viewWidth={W}
            style={{
              opacity: interpolate(frame, [100, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              scale: interpolate(frame, [110, 150], [1, 1.3], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
              translate: interpolate(frame, [110, 150], ["0px 0px", "0px -71px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
            }}
          >
            {frame >= 160 ? (
              <div
                style={{
                  position: "absolute",
                  left: 231,
                  top: 318,
                  width: 15,
                  height: 15,
                  borderRadius: 3,
                  backgroundColor: colors.gold,
                  color: colors.navyDark,
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: "15px",
                  textAlign: "center",
                }}
              >
                ✓
              </div>
            ) : null}
            <Highlight x={222} y={355} w={180} h={700} style={{ opacity: interpolate(frame, [165, 175], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
            <Cursor
              clickAt={60}
              size={60}
              style={{
                translate: interpolate(frame, [120, 155], ["900px 700px", "238px 325px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.65, 0, 0.35, 1),
                }),
              }}
            />
          </Shot>
        </Sequence>

        <Sequence name="Product" from={220} durationInFrames={130} premountFor={fps}>
          <Shot
            src={frame >= 273 ? "shots/product-added.png" : "shots/product.png"}
            imgWidth={1920}
            imgHeight={1080}
            viewWidth={W}
            style={{
              opacity: interpolate(frame, [220, 230], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              scale: interpolate(frame, [228, 262], [1, 1.25], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
              translate: interpolate(frame, [228, 262], ["0px 0px", "-310px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
            }}
          >
            <Highlight
              x={1352}
              y={13}
              w={177}
              h={60}
              style={{ opacity: interpolate(frame, [282, 292], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}
            />
            <Cursor
              clickAt={52}
              size={56}
              style={{
                translate: interpolate(frame, [230, 265], ["700px 700px", "1190px 287px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.65, 0, 0.35, 1),
                }),
              }}
            />
          </Shot>
        </Sequence>

        <Sequence name="Quote" from={340} durationInFrames={140} premountFor={fps}>
          <Shot
            src="shots/quote.png"
            imgWidth={1920}
            imgHeight={1080}
            viewWidth={W}
            style={{
              opacity: interpolate(frame, [340, 350], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              scale: interpolate(frame, [370, 420], [1, 1.15], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
              translate: interpolate(frame, [370, 420], ["0px 0px", "0px -104px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
            }}
          >
            <FieldText x={231} y={502}>{typed("Alex P.", frame, 348, 362)}</FieldText>
            <FieldText x={231} y={581}>{typed("alex@riversideauto.ca", frame, 362, 385)}</FieldText>
            <FieldText x={231} y={740}>{typed("Windsor", frame, 385, 395)}</FieldText>
            <FieldText x={231} y={819}>{typed("Riverside Auto Service", frame, 395, 415)}</FieldText>
            <Cursor
              clickAt={105}
              size={56}
              style={{
                translate: interpolate(frame, [415, 442], ["1100px 700px", "328px 1023px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.65, 0, 0.35, 1),
                }),
              }}
            />
          </Shot>
          <Toast
            title="Quote request sent"
            detail="RFQ-2026-90214 · your team is notified by email"
            style={{
              right: 36,
              top: 36,
              opacity: interpolate(frame, [448, 456], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: interpolate(frame, [448, 462], ["0px -40px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.56, 0.64, 1),
              }),
            }}
          />
        </Sequence>
      </BrowserFrame>
    </AbsoluteFill>
  );
};

const customerSchema = {
  headline: { type: "text-content", default: "", description: "Headline" },
} as const satisfies InteractivitySchema;

export const CustomerScene = Interactive.withSchema({
  Component: CustomerSceneInner,
  componentName: "<CustomerScene>",
  schema: customerSchema,
  wrapInSequence: true,
});
