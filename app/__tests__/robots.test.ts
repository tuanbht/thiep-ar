import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "../robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
  it("names the sitemap at the site's own address", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thiep.example.vn/");
    expect((await robots()).sitemap).toBe(
      "https://thiep.example.vn/sitemap.xml",
    );
  });

  it("keeps crawlers out of the API, and lets them reach gift links: messengers build link previews from them", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thiep.example.vn");
    const rules = [(await robots()).rules].flat();
    expect(rules).toEqual([
      expect.objectContaining({
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      }),
    ]);
    const blocked = rules.flatMap((r) => [r.disallow ?? []].flat());
    for (const path of ["/g/", "/cards/", "/"])
      expect(blocked).not.toContain(path);
  });
});
