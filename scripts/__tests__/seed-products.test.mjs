import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { categories, products, seedSql } from "../seed-products.mjs";

let dir;
const put = async (id, files) => {
  await fs.mkdir(path.join(dir, "templates", id), { recursive: true });
  for (const [name, body] of Object.entries(files))
    await fs.writeFile(path.join(dir, "templates", id, name), body);
};
const card = (tpl, form = { label: "Một tấm thiệp" }) => ({
  "template.json": JSON.stringify(tpl),
  "form.json": JSON.stringify(form),
  "targets.mind": "x",
});

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "seed-"));
  await fs.mkdir(path.join(dir, "thumbs"));
  for (const id of ["flower-letter", "rain", "mochi", "no-thumb"])
    if (id !== "no-thumb")
      await fs.writeFile(path.join(dir, "thumbs", `${id}.jpg`), "jpg");
  await put(
    "flower-letter",
    card({
      name: "Thư hoa",
      kind: "3d",
      categories: ["family"],
      tags: ["Mẹ", " 20/10 ", "mẹ"],
    }),
  );
  await put(
    "mochi",
    card({ name: "Mochi", kind: "3d", categories: ["fun", "love", "fun"] }),
  );
  await put(
    "rain",
    card({ name: "Mưa tạnh, it's over", categories: ["love"] }),
  );
  await put("no-thumb", card({ name: "Unfinished", kind: "3d" })); // no shop picture yet: not for sale
  await put("no-form", { "template.json": "{}", "targets.mind": "x" }); // nothing for a buyer to write
  await fs.writeFile(
    path.join(dir, "categories.json"),
    JSON.stringify([
      { id: "love", name: "Tình yêu", blurb: "Gửi người thương" },
      { id: "family", name: "Gia đình" },
      { id: "fun", name: "Vui nhộn" },
    ]),
  );
});
afterAll(() => fs.rm(dir, { recursive: true, force: true }));

const known = async () =>
  new Set(
    (await categories(path.join(dir, "categories.json"))).map((c) => c.id),
  );

describe("the seed", () => {
  it("reads the categories in shelf order", async () => {
    expect(await categories(path.join(dir, "categories.json"))).toEqual([
      { id: "love", name: "Tình yêu", blurb: "Gửi người thương", sort: 10 },
      { id: "family", name: "Gia đình", blurb: null, sort: 20 },
      { id: "fun", name: "Vui nhộn", blurb: null, sort: 30 },
    ]);
  });

  it("sells each finished card, with its categories and its search words cleaned up", async () => {
    const list = await products(
      path.join(dir, "templates"),
      await known(),
      path.join(dir, "thumbs"),
    );
    expect(list.map((p) => p.id)).toEqual(["flower-letter", "mochi", "rain"]);
    expect(list[0]).toMatchObject({
      categories: ["family"],
      tags: ["mẹ", "20/10"],
    });
    expect(list[1]).toMatchObject({ categories: ["fun", "love"], tags: [] });
  });

  it("refuses a category that categories.json does not have", async () => {
    await put("stray", card({ name: "Stray", categories: ["nope"] }));
    await fs.writeFile(path.join(dir, "thumbs", "stray.jpg"), "jpg");
    await expect(
      products(
        path.join(dir, "templates"),
        await known(),
        path.join(dir, "thumbs"),
      ),
    ).rejects.toThrow("stray: unknown category nope");
    await fs.rm(path.join(dir, "templates", "stray"), { recursive: true });
  });

  it("writes the categories, the products with their words, and which product is in which category", async () => {
    const list = await products(
      path.join(dir, "templates"),
      await known(),
      path.join(dir, "thumbs"),
    );
    const out = seedSql(
      list,
      await categories(path.join(dir, "categories.json")),
    );
    expect(out).toContain("('love', 'Tình yêu', 'Gửi người thương', 10)");
    expect(out).toContain("array['mẹ', '20/10']::text[]");
    expect(out).toContain("'Mưa tạnh, it''s over'"); // quotes doubled
    expect(out).toContain(
      "delete from public.product_categories where product_id in ('flower-letter', 'mochi', 'rain');",
    );
    expect(out).toContain("('mochi', 'fun'),\n  ('mochi', 'love')");
    expect(out.indexOf("public.categories")).toBeLessThan(
      out.indexOf("insert into public.products"),
    );
    expect(out.indexOf("insert into public.products")).toBeLessThan(
      out.indexOf("insert into public.product_categories"),
    );
  });
});
