import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useVideoConfig } from "remotion";
import { CustomerScene } from "./scenes/CustomerScene";
import { EditorScene } from "./scenes/EditorScene";
import { HookScene } from "./scenes/HookScene";
import { McpScene } from "./scenes/McpScene";
import { TogetherScene } from "./scenes/TogetherScene";

export const CATradersPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries name="Promo">
      <TransitionSeries.Sequence name="Hook" durationInFrames={150} premountFor={fps}>
        <HookScene tagline="Your catalog. Your team. Your AI." />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Customers" durationInFrames={480} premountFor={fps}>
        <CustomerScene headline="Your shop, open 24/7" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Editors" durationInFrames={480} premountFor={fps}>
        <EditorScene headline="No developer needed" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="MCP" durationInFrames={420} premountFor={fps}>
        <McpScene headline="Or just ask Claude" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Together" durationInFrames={330} premountFor={fps}>
        <TogetherScene headline="It all works together" closing="One catalog. Always up to date." />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
