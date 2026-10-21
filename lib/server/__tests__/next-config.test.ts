import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("next.config", () => {
  it("puts a page's link preview in <head> for the crawlers of the apps gift links are shared in", () => {
    const bots = nextConfig.htmlLimitedBots;
    expect(bots).toBeInstanceOf(RegExp);
    for (const ua of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "WhatsApp/2.24.1 A",
      "TelegramBot (like TwitterBot)",
      "Mozilla/5.0 (compatible; ZaloBot/1.0)",
      "Mozilla/5.0 (Linux; Android 14) Zalo android/12.4",
      "Viber/22.1.0",
      "Mozilla/5.0 (iPhone) Line/14.1.0",
      "Twitterbot/1.0",
    ])
      expect(bots!.test(ua), ua).toBe(true);
  });

  it("still streams metadata to ordinary browsers", () => {
    const bots = nextConfig.htmlLimitedBots!;
    expect(
      bots.test(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(
      bots.test(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
  });
});
