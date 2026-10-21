// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerWaiting } from "../GiftPlayer";
import { LiveWaiting } from "../LivePreview";
import { T, T_BLUSH } from "../strings";

vi.mock("../fonts", () => ({ fontVars: "fonts" }));
afterEach(cleanup);

describe("while the player loads", () => {
  it("waits in pink with soft words on a love card, so it never opens navy", () => {
    const { container } = render(<PlayerWaiting theme="blush" />);
    expect(container.firstElementChild!.className).toContain("gp-blush");
    expect(container.textContent).toBe(T_BLUSH.loading);
  });

  it("waits in the shop's night on the other cards", () => {
    const { container } = render(<PlayerWaiting theme="night" />);
    expect(container.firstElementChild!.className).not.toContain("gp-blush");
    expect(container.textContent).toBe(T.loading);
  });

  it("does the same in the shop's preview box", () => {
    const { container } = render(<LiveWaiting theme="blush" />);
    expect(container.firstElementChild!.className).toContain("gp-live-blush");
    expect(container.textContent).toBe(T_BLUSH.loading);
    cleanup();
    expect(
      render(<LiveWaiting theme="night" />).container.firstElementChild!
        .className,
    ).not.toContain("gp-live-blush");
  });
});
