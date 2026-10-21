// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DraftNote } from "../DraftNote";
import type { DraftStatus } from "../useDraft";

const IDLE: DraftStatus = {
  restoredAt: null,
  savedAt: null,
  photosLost: 0,
  photosUnsaved: false,
  failed: false,
};
const AT = Date.parse("2026-10-21T02:15:00Z");
const note = (status: Partial<DraftStatus>) => {
  render(
    <DraftNote
      status={{ ...IDLE, ...status }}
      dirty
      busy={false}
      onStartOver={() => {}}
    />,
  );
  return screen.getByRole("status").textContent ?? "";
};

afterEach(cleanup);

describe("DraftNote", () => {
  it("says when the draft was kept, and when it was kept without the photos for want of room", () => {
    expect(note({ savedAt: AT })).toMatch(/^Đã lưu nháp/);
    cleanup();
    expect(note({ savedAt: AT, photosUnsaved: true })).toMatch(
      /^Đã lưu nháp .*hết chỗ giữ ảnh$/,
    );
  });

  it("says when the draft came back, and when it could not be kept at all", () => {
    expect(note({ restoredAt: AT, savedAt: AT })).toMatch(
      /^Đã mở lại bản nháp/,
    );
    cleanup();
    expect(note({ savedAt: AT, failed: true })).toBe(
      "Máy này không lưu được bản nháp",
    );
  });
});
