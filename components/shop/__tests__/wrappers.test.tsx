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

const { GiftClient } = await import("../GiftClient");
const { PreviewPanel } = await import("../PreviewPanel");
const card = { title: "Gửi Hanna" } as never;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the player wrappers", () => {
  it("the gift page counts the player's moments against the gift", () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    render(<GiftClient card={card} slug="AbC123xyz0" />);
    fireEvent.click(screen.getByRole("button", { name: "Gửi Hanna" }));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      name: "letter_open",
      giftSlug: "AbC123xyz0",
      props: { chapter: 1 },
    });
  });

  it("the preview frames the live player with its label", () => {
    const onEvent = vi.fn();
    render(<PreviewPanel card={card} onEvent={onEvent} />);
    expect(screen.getByText("Xem trước")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gửi Hanna" }));
    expect(onEvent).toHaveBeenCalledWith("letter_open", { chapter: 1 });
  });
});
