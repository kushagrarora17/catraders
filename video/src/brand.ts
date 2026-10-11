import { loadFont as loadBarlow } from "@remotion/google-fonts/Barlow";
import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";

export const { fontFamily: bodyFont } = loadBarlow("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const { fontFamily: headingFont } = loadBarlowCondensed("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

// Mirrors src/styles/themes/automotive.css
export const colors = {
  navyDark: "#111d29",
  navy: "#1c2d3f",
  navyMid: "#243447",
  gold: "#f0a500",
  goldLight: "#ffc533",
  offWhite: "#f8f7f4",
  slate: "#8a9ab0",
  slateLight: "#b4c0d0",
  success: "#6fcf97",
  destructive: "#ff8a80",
};

// Mirrors src/features/site/logo-paths.ts
export const LOGO_VIEWBOX = "0 0 44 44";
export const LOGO_TRIANGLE = "M22 0 44 44H0Z";
export const LOGO_DROP = "M22 16c-3 4.2-5 7.4-5 10a5 5 0 0 0 10 0c0-2.6-2-5.8-5-10Z";

export const SITE_URL = "app-catraders-prod-buwp.azurewebsites.net";
