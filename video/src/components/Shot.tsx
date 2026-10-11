import type React from "react";
import { CanvasImage, staticFile, useVideoConfig } from "remotion";

type Props = {
  readonly src: string;
  readonly imgWidth: number;
  readonly imgHeight: number;
  /** Width of the viewport the screenshot is fitted to. */
  readonly viewWidth: number;
  /** Overlays positioned in screenshot pixels; they pan and zoom with the image. */
  readonly children?: React.ReactNode;
  /** Camera: `scale` and `translate` around the top-left corner. */
  readonly style?: React.CSSProperties;
};

export const Shot: React.FC<Props> = ({ src, imgWidth, imgHeight, viewWidth, children, style }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", ...style }}>
      <div
        style={{
          position: "relative",
          width: imgWidth,
          height: imgHeight,
          transformOrigin: "0 0",
          scale: String(viewWidth / imgWidth),
        }}
      >
        <CanvasImage
          src={staticFile(src)}
          width={imgWidth}
          height={imgHeight}
          fit="fill"
          premountFor={fps}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
        {children}
      </div>
    </div>
  );
};
