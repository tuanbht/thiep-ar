// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/* next/dynamic, as the browser would resolve it: the player's components stand in as plain stubs that report an event */
vi.mock("next/dynamic", () => ({
  default: (_load: unknown, opts: { loading: () => React.ReactNode }) => {
    function Stub(props: {
      card: { title: string };
      onEvent?: (n: string, p?: object) => void;
    }) {
      return (
        <button
          type="button"
          onClick={() => props.onEvent?.("letter_open", { chapter: 1 })}
        >
          {props.card.title}
        </button>
      );
    }
    Stub.loading = opts.loading;
    return Stub;
  },
}));

vi.mock("@/components/player/fonts", () => ({ fontVars: "fonts" }));

const { GiftClient } = await import("../GiftClient");
const { PreviewPanel } = await import("../PreviewPanel");
const card = { title: "Gửi Hanna" } as never;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the player wrappers", () => {
  it("the gift page counts its opening and the player's moments against its card, never its link", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
    delete (window as { dataLayer?: unknown }).dataLayer;
    render(<GiftClient card={card} productId="mochi" />);
    fireEvent.click(screen.getByRole("button", { name: "Gửi Hanna" }));
    const sent = (window as { dataLayer?: IArguments[] })
      .dataLayer!.map((a) => Array.from(a))
      .filter((c) => c[0] === "event");
    expect(sent.map((c) => c[1])).toEqual(["gift_open", "letter_open"]);
    expect(sent[1][2]).toMatchObject({ product_id: "mochi", chapter: 1 });
    vi.unstubAllEnvs();
  });

  it("the preview frames the live player with its label", () => {
    const onEvent = vi.fn();
    render(<PreviewPanel card={card} onEvent={onEvent} />);
    expect(screen.getByText("Xem trước")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gửi Hanna" }));
    expect(onEvent).toHaveBeenCalledWith("letter_open", { chapter: 1 });
  });

  it("the preview box is pink behind a love card, before the player is there", () => {
    const box = (theme?: string) =>
      render(
        <PreviewPanel card={{ title: "Gửi Hanna", theme } as never} />,
      ).container.querySelector("figure > div")!.className;
    expect(box("blush")).toContain("#ffe3ec");
    cleanup();
    expect(box()).toContain("--color-night");
  });
});
