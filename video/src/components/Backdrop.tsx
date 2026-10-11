import { AbsoluteFill } from "remotion";
import { colors } from "../brand";

export const Backdrop: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.navyDark,
        backgroundImage: `radial-gradient(circle at 85% 15%, rgba(240,165,0,0.16), transparent 45%), linear-gradient(rgba(240,165,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(240,165,0,0.05) 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 72px 72px, 72px 72px",
      }}
    />
  );
};
