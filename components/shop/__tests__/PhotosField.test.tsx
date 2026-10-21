// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/api/dto";
import { PhotosField, type PhotoItem } from "../PhotosField";

let seen: PhotoItem[] = [];
const report = (photos: PhotoItem[]) => {
  seen = photos;
};
const busy = vi.fn();
function Harness({ start = [] as PhotoItem[], places = 1, lost = 0 }) {
  const [photos, setPhotos] = useState<PhotoItem[]>(start);
  useEffect(() => report(photos), [photos]);
  return (
    <PhotosField
      value={photos}
      onChange={setPhotos}
      onBusy={busy}
      places={places}
      lost={lost}
    />
  );
}

const file = (name: string, type = "image/jpeg", bytes = 3) =>
  new File([new Uint8Array(bytes)], name, { type });
const pick = (...files: File[]) =>
  fireEvent.change(document.querySelector("input[type=file]")!, {
    target: { files },
  });
let uploads = 0;
const answer = (ok = true) =>
  vi.fn().mockImplementation(async () =>
    ok
      ? new Response(
          JSON.stringify({
            photoPath: `drafts/00000000-0000-4000-8000-${String(++uploads).padStart(12, "0")}.jpg`,
            previewUrl: "x",
          }),
          { status: 201 },
        )
      : new Response(JSON.stringify({ error: "Ảnh này không đọc được." }), {
          status: 400,
        }),
  );

beforeEach(() => {
  uploads = 0;
  busy.mockReset();
  let n = 0;
  Object.assign(URL, {
    createObjectURL: () => `blob:local/${++n}`,
    revokeObjectURL: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const k of ["createObjectURL", "revokeObjectURL"] as const)
    Reflect.deleteProperty(URL, k);
});

describe("PhotosField", () => {
  it("takes several photos at once, shows each at once and keeps where each was stored", async () => {
    vi.stubGlobal("fetch", answer());
    render(<Harness />);
    pick(
      file("a.jpg"),
      file("b.png", "image/png"),
      file("c.webp", "image/webp"),
    );
    expect(screen.getAllByRole("img")).toHaveLength(3); // local previews, before the uploads end
    expect(busy).toHaveBeenLastCalledWith(true);
    await waitFor(() => expect(seen.filter((p) => p.path)).toHaveLength(3));
    expect(busy).toHaveBeenLastCalledWith(false);
    expect(new Set(seen.map((p) => p.path)).size).toBe(3);
    expect(screen.getByText(`3/${LIMITS.photos} ảnh`)).toBeTruthy();
  });

  it("names a photo it will not take and keeps the others", async () => {
    vi.stubGlobal("fetch", answer());
    render(<Harness />);
    pick(
      file("note.pdf", "application/pdf"),
      file("big.jpg", "image/jpeg", LIMITS.photoBytes + 1),
      file("ok.jpg"),
    );
    await waitFor(() => expect(seen.filter((p) => p.path)).toHaveLength(1));
    const alert = screen.getByRole("alert").textContent ?? "";
    expect(alert).toContain("note.pdf");
    expect(alert).toContain("big.jpg");
  });

  it("lets go of a photo the server refused, saying why", async () => {
    vi.stubGlobal("fetch", answer(false));
    render(<Harness />);
    pick(file("broken.jpg"));
    await waitFor(() => expect(seen).toHaveLength(0));
    expect(screen.getByRole("alert").textContent).toContain(
      "Ảnh này không đọc được.",
    );
  });

  it(`stops at ${LIMITS.photos} photos and says so`, async () => {
    vi.stubGlobal("fetch", answer());
    render(<Harness />);
    pick(
      ...Array.from({ length: LIMITS.photos + 2 }, (_, i) => file(`p${i}.jpg`)),
    );
    await waitFor(() =>
      expect(seen.filter((p) => p.path)).toHaveLength(LIMITS.photos),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      `tối đa ${LIMITS.photos} ảnh`,
    );
    expect(screen.queryByRole("button", { name: /Thêm ảnh/ })).toBeNull(); // full: nothing more to add
  });

  it("takes one photo out, by its own button", async () => {
    const start: PhotoItem[] = [1, 2, 3].map((i) => ({
      id: `p${i}`,
      path: `drafts/${i}.jpg`,
      previewUrl: `data:image/jpeg;base64,${i}`,
    }));
    render(<Harness start={start} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh 2" }));
    });
    expect(seen.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("stops the upload of a photo taken out before it ends, and one still waiting its turn never starts", async () => {
    const started: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => {
            started.push(init.signal!);
            init.signal!.addEventListener("abort", () =>
              reject(new DOMException("stopped", "AbortError")),
            );
          }),
      ),
    );
    render(<Harness />);
    pick(file("a.jpg"), file("b.jpg"), file("c.jpg"), file("d.jpg")); // three at once: the fourth waits
    await waitFor(() => expect(started).toHaveLength(3));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh 4" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh 1" }));
    });
    expect(started[0].aborted).toBe(true);
    expect(seen).toHaveLength(2);
    expect(screen.queryByRole("alert")).toBeNull(); // taken out: nothing to complain about
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh 1" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh 1" }));
    });
    expect(started).toHaveLength(3); // the fourth never went
    expect(started.every((s) => s.aborted)).toBe(true);
    expect(busy).toHaveBeenLastCalledWith(false);
  });

  it("says how the card uses the photos, and when some of a draft's could not come back", () => {
    render(<Harness places={7} lost={2} />);
    expect(screen.getByText(/7 chỗ cho ảnh/)).toBeTruthy();
    expect(
      screen.getByText(/2 ảnh của bản nháp không mở lại được/),
    ).toBeTruthy();
    cleanup();
    render(<Harness places={0} />);
    expect(screen.getByText(/lá thư cuối/)).toBeTruthy();
  });
});
