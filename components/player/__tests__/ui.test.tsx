// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeCard } from "@/lib/player/core/card";
import { T_BLUSH, wordsFor } from "../strings";
import { Hint, Intro, Letter, ReadView } from "../ui";

const card = mergeCard({
  template: "mochi",
  title: "Gửi Hanna",
  letter: { to: "Hanna à,", body: ["Một dòng."], from: "Yêu em." },
});

afterEach(cleanup);

describe("Letter", () => {
  it("shows every photo: one wide, several as a strip of prints, none when there are none", () => {
    const with_ = (photos: string[]) => mergeCard({ ...card, photos });
    const imgs = () =>
      [...document.querySelectorAll("article img")].map((i) =>
        i.getAttribute("src"),
      );
    render(<Letter card={with_(["https://p/1.jpg"])} />);
    expect(imgs()).toEqual(["https://p/1.jpg"]);
    cleanup();
    render(
      <Letter
        card={with_(["https://p/1.jpg", "https://p/2.jpg", "https://p/3.jpg"])}
      />,
    );
    expect(imgs()).toEqual([
      "https://p/1.jpg",
      "https://p/2.jpg",
      "https://p/3.jpg",
    ]);
    expect(document.querySelector(".gp-photos")).not.toBeNull();
    cleanup();
    render(<Letter card={card} />);
    expect(imgs()).toEqual([]);
  });

  it("leaves out a photo that will not load (its link ran out), keeping the others", () => {
    const imgs = () => [...document.querySelectorAll("article img")];
    render(
      <Letter
        card={mergeCard({
          ...card,
          photos: ["https://p/1.jpg", "https://p/2.jpg", "https://p/3.jpg"],
        })}
      />,
    );
    fireEvent.error(imgs()[1]);
    expect(imgs().map((i) => i.getAttribute("src"))).toEqual([
      "https://p/1.jpg",
      "https://p/3.jpg",
    ]);
    fireEvent.error(imgs()[0]);
    expect(imgs().map((i) => i.getAttribute("src"))).toEqual([
      "https://p/3.jpg",
    ]); // one left: shown wide, not in a strip
    expect(document.querySelector(".gp-photos")).toBeNull();
    fireEvent.error(imgs()[0]);
    expect(imgs()).toHaveLength(0);
  });
});

describe("Hint", () => {
  it("keeps its live region mounted while there is nothing to say, so the next hint is announced", () => {
    const { container, rerender } = render(<Hint text={null} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.textContent).toBe("");
    rerender(<Hint text="Đang tìm tấm thiệp" />);
    expect(container.querySelector('[aria-live="polite"]')).toBe(live);
    expect(live!.textContent).toBe("Đang tìm tấm thiệp");
  });

  it("is plain words while the act plays and a button while it waits at a stop", () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Hint text="Đang tìm tấm thiệp" />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<Hint text="Chạm để xem ảnh" onActivate={onActivate} />);
    const button = screen.getByRole("button", { name: "Chạm để xem ảnh" });
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute("data-ui")).toBe(true); // the act's own tap listener leaves it alone: no double step
  });

  it("takes the focus when the last stop was passed with the keys", () => {
    render(<Hint text="Chạm để đọc thư" onActivate={() => {}} autoFocus />);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Chạm để đọc thư" }),
    );
  });
});

describe("ReadView", () => {
  it("opens as a dialog with the focus on the letter", () => {
    render(<ReadView card={card} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement?.id).toBe("letter-read");
  });

  it("closes on Escape and with its button", () => {
    const onClose = vi.fn();
    render(<ReadView card={card} onClose={onClose} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stops listening for Escape once it is closed", () => {
    const onClose = vi.fn();
    const { unmount } = render(<ReadView card={card} onClose={onClose} />);
    unmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("Intro", () => {
  const intro = (extra: object) =>
    render(
      <Intro
        title="Hẹn hò dưới sao"
        template="starry-date"
        lead=""
        ready
        onStart={() => {}}
        onNoCamera={() => {}}
        {...extra}
      />,
    );

  it("fans the buyer's photos over the card's picture, three at most", () => {
    const photos = ["a", "b", "c", "d"].map((x) => `https://p/${x}.jpg`);
    const { container } = intro({ photos });
    expect(
      [...container.querySelectorAll(".gp-photo-fan img")].map((i) =>
        i.getAttribute("src"),
      ),
    ).toEqual(photos.slice(0, 3));
  });

  it("speaks the theme's words", () => {
    intro({ words: wordsFor("blush") });
    expect(screen.getByText(T_BLUSH.eyebrow)).toBeTruthy();
  });
});
