import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTemplateCatalog, getTemplateInfo } from "../templates";

describe("the template catalog on the real templates", () => {
  it("reads a 3D act with its form", async () => {
    const t = await getTemplateInfo("flower-letter");
    expect(t).toMatchObject({
      id: "flower-letter",
      name: "Thư hoa (Flower Letter)",
      kind: "3d",
      aspect: 0.625,
      chapters: 2,
    });
    expect(t!.form!.groups[0].rows[0][0].slot).toBe("board");
  });

  it("knows each card's theme: blush for love and couple cards, the shop's night for the rest", async () => {
    expect((await getTemplateInfo("flower-letter"))?.theme).toBe("blush");
    expect((await getTemplateInfo("starry-date"))?.theme).toBe("blush");
    expect((await getTemplateInfo("mochi"))?.theme).toBe("night");
  });

  it("reads a film", async () => {
    expect(await getTemplateInfo("rain-clearing")).toMatchObject({
      kind: "film",
      chapters: 8,
    });
  });

  it("has no form for a template without form.json", async () => {
    expect((await getTemplateInfo("night-mail"))?.form).toBeNull();
  });

  it("knows nothing of a template that is not there, or of a name that is not an id", async () => {
    expect(await getTemplateInfo("no-such-card")).toBeNull();
    expect(await getTemplateInfo("../prints")).toBeNull();
    expect(await getTemplateInfo("_acts/../flower-letter")).toBeNull();
  });
});

describe("createTemplateCatalog", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "catalog-"));
    const put = async (id: string, file: string, body: string) => {
      await mkdir(path.join(dir, id), { recursive: true });
      await writeFile(path.join(dir, id, file), body);
    };
    await put(
      "ok",
      "template.json",
      JSON.stringify({ kind: "3d", chapters: [0], aspect: 0.7 }),
    );
    await put(
      "ok",
      "form.json",
      JSON.stringify({ label: "OK", preset: {}, groups: [] }),
    );
    await put("bad-form", "template.json", JSON.stringify({ chapters: [1.5] }));
    await put("bad-form", "form.json", JSON.stringify({ groups: "no" }));
    await put("torn", "template.json", "{ not json");
    await put("no-stops", "template.json", JSON.stringify({ chapters: [] }));
    await put(
      "film-photos",
      "template.json",
      JSON.stringify({ chapters: [1], photos: 7 }),
    );
    await put(
      "many-photos",
      "template.json",
      JSON.stringify({ chapters: [1], photos: 99 }),
    );
    await put(
      "odd-photos",
      "template.json",
      JSON.stringify({ chapters: [1], photos: "3" }),
    );
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("names a template by its id when it has no name, and fills the form's defaults", async () => {
    const t = await createTemplateCatalog(dir).getTemplateInfo("ok");
    expect(t).toMatchObject({
      name: "ok",
      kind: "3d",
      aspect: 0.7,
      chapters: 1,
    });
    expect(t!.form).toEqual({
      label: "OK",
      preset: { title: "", intro: "", to: "", body: [], from: "" },
      groups: [],
    });
  });

  it("keeps a template whose form is broken, without the form, and says so in the log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await createTemplateCatalog(dir).getTemplateInfo("bad-form"),
    ).toMatchObject({ kind: "film", form: null });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("skips a template.json that is not JSON or has no stops", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const c = createTemplateCatalog(dir);
    expect(await c.getTemplateInfo("torn")).toBeNull();
    expect(await c.getTemplateInfo("no-stops")).toBeNull();
    log.mockRestore();
  });

  it("knows how many photo places a card has: none unless it says, never more than twenty", async () => {
    const c = createTemplateCatalog(dir);
    const places = async (id: string) =>
      (await c.getTemplateInfo(id))?.photoPlaces;
    expect([
      await places("ok"),
      await places("film-photos"),
      await places("many-photos"),
      await places("odd-photos"),
    ]).toEqual([0, 7, 20, 0]);
  });

  it("reads each template once when caching, every time when not", async () => {
    const cached = createTemplateCatalog(dir),
      fresh = createTemplateCatalog(dir, { cache: false });
    expect(cached.getTemplateInfo("ok")).toBe(cached.getTemplateInfo("ok"));
    expect(fresh.getTemplateInfo("ok")).not.toBe(fresh.getTemplateInfo("ok"));
  });
});
