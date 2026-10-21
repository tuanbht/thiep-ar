/* The player's two faces, self-hosted by Next: Barlow Condensed for the signs and buttons, Lora for the letter. */
import { Barlow_Condensed, Lora } from "next/font/google";

export const signFont = Barlow_Condensed({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["500", "700", "800"],
  variable: "--gp-f-sign",
  display: "swap",
});

export const textFont = Lora({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--gp-f-text",
  display: "swap",
});

export const fontVars = `${signFont.variable} ${textFont.variable}`;
