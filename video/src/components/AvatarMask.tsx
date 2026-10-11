import { colors, headingFont } from "../brand";

type Props = {
  readonly x?: number;
  readonly y?: number;
  readonly size?: number;
};

/** Covers the signed-in user's avatar in Studio screenshots (defaults to the top-right one). */
export const AvatarMask: React.FC<Props> = ({ x = 1326, y = 10, size = 31 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.gold,
        color: colors.navyDark,
        fontFamily: headingFont,
        fontWeight: 800,
        fontSize: size * 0.45,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      CA
    </div>
  );
};
