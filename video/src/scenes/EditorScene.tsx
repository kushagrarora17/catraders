import type React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, Sequence, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame } from "../components/BrowserFrame";
import { Cursor } from "../components/Cursor";
import { Highlight } from "../components/Highlight";
import { Shot } from "../components/Shot";
import { Bullet, Heading } from "../components/SideText";
import { Toast } from "../components/Toast";
import { AvatarMask } from "../components/AvatarMask";
import { bodyFont, SITE_URL } from "../brand";

const W = 1240;
const H = 533;
const STUDIO_W = 1366;
const STUDIO_H = 587;

const fadeIn = (frame: number, start: number) =>
  interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

type Props = {
  readonly headline: string;
  readonly style?: React.CSSProperties;
};

const EditorSceneInner: React.FC<Props> = ({ headline, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily: bodyFont, ...style }}>
      <Backdrop />
      <Heading name="Heading" kicker="02 · YOUR TEAM" premountFor={fps}>
        {headline}
      </Heading>
      <Bullet name="Bullet browser" from={0.4 * fps} premountFor={fps} style={{ top: 470 }}>
        Edit products in any browser
      </Bullet>
      <Bullet name="Bullet stock" from={5 * fps} premountFor={fps} style={{ top: 595 }}>
        Flip stock with one switch
      </Bullet>
      <Bullet name="Bullet specs" from={10 * fps} premountFor={fps} style={{ top: 720 }}>
        Specs become site filters
      </Bullet>
      <Bullet name="Bullet reviews" from={12.4 * fps} premountFor={fps} style={{ top: 845 }}>
        Publish customer reviews
      </Bullet>

      <BrowserFrame
        url={frame >= 415 ? SITE_URL : "CA Traders · Sanity Studio"}
        width={W}
        height={H}
        style={{
          left: 600,
          top: 250,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [0, 25], ["80px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Sequence name="Desk" durationInFrames={90} premountFor={fps}>
          <Shot
            src="shots/studio-list.jpg"
            imgWidth={STUDIO_W}
            imgHeight={STUDIO_H}
            viewWidth={W}
            style={{
              scale: interpolate(frame, [0, 80], [1, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: interpolate(frame, [0, 80], ["0px 0px", "-50px -21px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <AvatarMask />
            <Highlight x={12} y={100} w={326} h={35} thickness={3} style={{ opacity: fadeIn(frame, 31) }} />
            <Cursor
              clickAt={[30, 68]}
              size={48}
              style={{
                translate: interpolate(frame, [5, 27, 40, 64], ["700px 420px", "90px 117px", "90px 117px", "500px 203px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.65, 0, 0.35, 1),
                }),
              }}
            />
          </Shot>
        </Sequence>

        <Sequence name="Product form" from={80} durationInFrames={80} premountFor={fps}>
          <Shot
            src="shots/studio-product.jpg"
            imgWidth={STUDIO_W}
            imgHeight={STUDIO_H}
            viewWidth={W}
            style={{
              opacity: fadeIn(frame, 80),
              scale: interpolate(frame, [80, 150], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: interpolate(frame, [80, 150], ["0px 0px", "-74px -16px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <AvatarMask />
            <Highlight x={692} y={368} w={612} h={46} thickness={3} style={{ opacity: fadeIn(frame, 95) }} />
          </Shot>
        </Sequence>

        <Sequence name="Stock switch" from={150} durationInFrames={160} premountFor={fps}>
          <Shot
            src="shots/studio-stock.jpg"
            imgWidth={STUDIO_W}
            imgHeight={STUDIO_H}
            viewWidth={W}
            style={{
              opacity: fadeIn(frame, 150),
              scale: interpolate(frame, [160, 190, 235, 260], [1, 1.35, 1.35, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
              translate: interpolate(frame, [160, 190, 235, 260], ["0px 0px", "-261px -186px", "-261px -186px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
            }}
          >
            <AvatarMask />
            {frame >= 206 ? (
              <div
                style={{
                  position: "absolute",
                  left: 704,
                  top: 359,
                  width: 31,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#24242e",
                  border: "1.5px solid #5a5a68",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ position: "absolute", left: 3, top: 3, width: 13, height: 13, borderRadius: 7, backgroundColor: "#9a9aa8" }} />
              </div>
            ) : null}
            <Highlight x={698} y={346} w={600} h={71} thickness={3} style={{ opacity: fadeIn(frame, 206) }} />
            <Highlight x={1230} y={546} w={86} h={32} thickness={3} style={{ opacity: fadeIn(frame, 266) }} />
            <Cursor
              clickAt={[55, 115]}
              size={48}
              style={{
                translate: interpolate(frame, [165, 200, 240, 262], ["1000px 470px", "719px 372px", "719px 372px", "1272px 562px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.65, 0, 0.35, 1),
                }),
              }}
            />
          </Shot>
          <Toast
            title="Published"
            detail="Live on the website in seconds"
            style={{
              right: 36,
              top: 30,
              opacity: fadeIn(frame, 268),
              translate: interpolate(frame, [268, 282], ["0px -40px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.56, 0.64, 1),
              }),
            }}
          />
        </Sequence>

        <Sequence name="Attributes" from={300} durationInFrames={80} premountFor={fps}>
          <Shot
            src="shots/studio-attributes.jpg"
            imgWidth={STUDIO_W}
            imgHeight={STUDIO_H}
            viewWidth={W}
            style={{
              opacity: fadeIn(frame, 300),
              scale: interpolate(frame, [300, 370], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: interpolate(frame, [300, 370], ["0px 0px", "-60px -12px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <AvatarMask />
            <Highlight x={694} y={172} w={608} h={262} thickness={3} style={{ opacity: fadeIn(frame, 308) }} />
          </Shot>
        </Sequence>

        <Sequence name="Review form" from={370} durationInFrames={55} premountFor={fps}>
          <Shot
            src="shots/studio-review.jpg"
            imgWidth={STUDIO_W}
            imgHeight={STUDIO_H}
            viewWidth={W}
            style={{ opacity: fadeIn(frame, 370) }}
          >
            <AvatarMask />
            <AvatarMask x={658} y={550} size={25} />
            <Highlight x={694} y={329} w={608} h={112} thickness={3} style={{ opacity: fadeIn(frame, 376) }} />
          </Shot>
        </Sequence>

        <Sequence name="Homepage reviews" from={415} durationInFrames={65} premountFor={fps}>
          <Shot
            src="shots/home-reviews.png"
            imgWidth={1920}
            imgHeight={1080}
            viewWidth={W}
            style={{
              opacity: fadeIn(frame, 415),
              scale: interpolate(frame, [415, 480], [1.05, 1.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: interpolate(frame, [415, 480], ["-31px -130px", "-62px -150px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <Highlight x={717} y={384} w={486} h={402} style={{ opacity: fadeIn(frame, 422) }} />
          </Shot>
          <Toast
            title="On your homepage"
            detail="Visible to every visitor"
            style={{ right: 36, bottom: 30, opacity: fadeIn(frame, 428) }}
          />
        </Sequence>
      </BrowserFrame>
    </AbsoluteFill>
  );
};

const editorSchema = {
  headline: { type: "text-content", default: "", description: "Headline" },
} as const satisfies InteractivitySchema;

export const EditorScene = Interactive.withSchema({
  Component: EditorSceneInner,
  componentName: "<EditorScene>",
  schema: editorSchema,
  wrapInSequence: true,
});
