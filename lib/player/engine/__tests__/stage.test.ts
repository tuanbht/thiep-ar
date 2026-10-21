import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { toneFor } from "../stage";

describe("toneFor", () => {
  it("keeps a love card's pastels bright with the neutral curve, and the night cards on ACES", () => {
    expect(toneFor("3d", "blush")).toEqual({
      toneMapping: THREE.NeutralToneMapping,
      exposure: 1.08,
    });
    expect(toneFor("3d", "night")).toEqual({
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1.05,
    });
    expect(toneFor("3d")).toEqual(toneFor("3d", "night"));
  });

  it("leaves a film's graded frames alone, whatever the theme", () => {
    for (const theme of ["blush", "night"] as const)
      expect(toneFor("film", theme)).toEqual({
        toneMapping: THREE.NoToneMapping,
        exposure: 1,
      });
  });
});
