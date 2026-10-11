import { Composition, Folder } from "remotion";
import { CATradersPromo } from "./CATradersPromo";
import { CustomerScene } from "./scenes/CustomerScene";
import { EditorScene } from "./scenes/EditorScene";
import { HookScene } from "./scenes/HookScene";
import { McpScene } from "./scenes/McpScene";
import { TogetherScene } from "./scenes/TogetherScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Scenes">
        <Composition
          id="Hook"
          component={HookScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={150}
          defaultProps={{ tagline: "Your catalog. Your team. Your AI." }}
        />
        <Composition
          id="Customers"
          component={CustomerScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={480}
          defaultProps={{ headline: "Your shop, open 24/7" }}
        />
        <Composition
          id="Editors"
          component={EditorScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={480}
          defaultProps={{ headline: "No developer needed" }}
        />
        <Composition
          id="MCP"
          component={McpScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={420}
          defaultProps={{ headline: "Or just ask Claude" }}
        />
        <Composition
          id="Together"
          component={TogetherScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={330}
          defaultProps={{ headline: "It all works together", closing: "One catalog. Always up to date." }}
        />
      </Folder>
      <Composition
        id="CATradersPromo"
        component={CATradersPromo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1800}
      />
    </>
  );
};
