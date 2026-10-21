/* Every word the player says by itself (the card's own words come with the card). Vietnamese: the recipients are. */
import type { Theme } from "@/lib/player/core/card";

export const T = {
  eyebrow: "Thiệp thực tế ảo",
  start: "Mở camera",
  noCamera: "Xem không cần camera",
  inAppTitle: "Hãy mở trang này bằng Safari hoặc Chrome.",
  inAppBody:
    "Trình duyệt trong ứng dụng này thường chặn camera. Chạm vào menu (··· hoặc ↗), chọn “Mở bằng trình duyệt”, hoặc sao chép đường dẫn:",
  looking: "Đang tìm tấm thiệp",
  tapToContinue: "Chạm để xem tiếp",
  pin: "Ghim tại đây",
  unpin: "Bỏ ghim",
  replay: "Xem lại",
  stopCamera: "Tắt camera",
  useCamera: "Dùng camera",
  backToCard: "Quay lại tấm thiệp",
  letterTitle: "Lá thư",
  retry: "Thử lại camera",
  noCameraApi:
    "Trình duyệt này không mở được camera, nên đây là phim của tấm thiệp.",
  cameraFailed: "Không mở được camera, nên đây là phim của tấm thiệp.",
  filmWithoutCamera: "Đây là phim của tấm thiệp, không cần camera.",
  loading: "Đang chuẩn bị tấm thiệp…",
  sceneFailed: "Không tải được cảnh của tấm thiệp này. Hãy thử tải lại trang.",
  templateMissing: "Không tìm thấy mẫu của tấm thiệp này.",
  readLetter: "Đọc thư",
  previewLabel: "Xem trước tấm thiệp",
  previewHint: "Kéo để xoay",
} as const;

/** What the player says differently on a love or couple card (the blush theme). */
export const T_BLUSH = {
  eyebrow: "Thiệp yêu thương",
  tapToContinue: "Chạm nhẹ để xem tiếp nhé",
  letterTitle: "Lá thư yêu thương",
  loading: "Đang gói yêu thương…",
} as const;

export type Words = { readonly [K in keyof typeof T]: string };

/** The player's words for a card's theme. */
export const wordsFor = (theme: Theme): Words =>
  theme === "blush" ? { ...T, ...T_BLUSH } : T;
