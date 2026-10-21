import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { parseRecipe, RecipeError, trimDocument } from "../pack-models.mjs";

/** a character: a body, a sword with a gem on it, and two clips that move them */
function character() {
  const doc = new Document(),
    buf = doc.createBuffer();
  const acc = (arr, type) =>
    doc
      .createAccessor()
      .setArray(new Float32Array(arr))
      .setType(type)
      .setBuffer(buf);
  const body = doc
    .createNode("Body")
    .setMesh(
      doc
        .createMesh("BodyMesh")
        .addPrimitive(
          doc
            .createPrimitive()
            .setAttribute("POSITION", acc([0, 0, 0, 1, 0, 0, 0, 1, 0], "VEC3")),
        ),
    );
  const sword = doc
    .createNode("1H_Sword")
    .setMesh(
      doc
        .createMesh("SwordMesh")
        .addPrimitive(
          doc
            .createPrimitive()
            .setAttribute("POSITION", acc([0, 0, 0, 0, 1, 0, 0, 0, 1], "VEC3")),
        ),
    );
  const gem = doc.createNode("Gem");
  sword.addChild(gem);
  doc.createScene().addChild(body).addChild(sword);
  const clip = (name, target) => {
    const s = doc
      .createAnimationSampler()
      .setInput(acc([0, 1], "SCALAR"))
      .setOutput(acc([0, 0, 0, 1, 0, 0], "VEC3"));
    return doc
      .createAnimation(name)
      .addSampler(s)
      .addChannel(
        doc
          .createAnimationChannel()
          .setTargetNode(target)
          .setTargetPath("translation")
          .setSampler(s),
      );
  };
  clip("Idle", body);
  clip("Attack", sword);
  const wave = clip("Wave", body);
  const s2 = doc
    .createAnimationSampler()
    .setInput(acc([0, 1], "SCALAR"))
    .setOutput(acc([0, 0, 0, 0, 1, 0], "VEC3"));
  wave
    .addSampler(s2)
    .addChannel(
      doc
        .createAnimationChannel()
        .setTargetNode(sword)
        .setTargetPath("translation")
        .setSampler(s2),
    );
  return doc;
}
const names = (list) => list.map((x) => x.getName()).sort();

describe("parseRecipe", () => {
  it("reads each model: its source, file, the parts to drop and the clips to keep", () => {
    expect(
      parseRecipe({
        boy: { from: "kaykit/Knight", drop: ["1H_Sword"], clips: ["Idle"] },
        sofa: { from: "furniture/couch" },
      }),
    ).toEqual([
      {
        name: "boy",
        source: "kaykit",
        file: "Knight",
        drop: ["1H_Sword"],
        clips: ["Idle"],
      },
      {
        name: "sofa",
        source: "furniture",
        file: "couch",
        drop: [],
        clips: null,
      },
    ]);
  });

  it("refuses what it cannot use", () => {
    for (const bad of [
      [],
      "x",
      { "b-o-y": { from: "kaykit/Knight" } },
      { boy: { from: "sketchfab/abc" } },
      { boy: { from: "kaykit/../x" } },
      { boy: { from: "kaykit" } },
      { boy: { from: "kaykit/Knight", clips: "Idle" } },
      { boy: { from: "kaykit/Knight", drop: [""] } },
    ])
      expect(() => parseRecipe(bad), JSON.stringify(bad)).toThrow(RecipeError);
  });
});

describe("trimDocument", () => {
  it("drops the parts (and what hangs from them) and the clips not asked for", () => {
    const doc = character(),
      root = doc.getRoot();
    expect(
      trimDocument(doc, { drop: ["1H_Sword"], clips: ["Idle", "Wave"] }),
    ).toEqual([]);
    expect(names(root.listNodes())).toEqual(["Body"]);
    expect(names(root.listAnimations())).toEqual(["Idle", "Wave"]);
    const wave = root.listAnimations().find((a) => a.getName() === "Wave");
    expect(
      wave.listChannels().map((c) => c.getTargetNode()?.getName()),
    ).toEqual(["Body"]); // its channel on the sword went too
    expect(wave.listSamplers()).toHaveLength(1);
  });

  it("keeps every clip when none are listed, and says what it could not find", () => {
    const doc = character();
    expect(trimDocument(doc, { drop: ["Helmet"], clips: null })).toEqual([
      "part Helmet",
    ]);
    expect(doc.getRoot().listAnimations()).toHaveLength(3);
    expect(trimDocument(character(), { drop: [], clips: ["Dance"] })).toEqual([
      "clip Dance (it has: Idle, Attack, Wave)",
    ]);
  });
});
