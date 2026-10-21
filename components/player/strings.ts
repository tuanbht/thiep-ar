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
  photoBig: "Ảnh phóng to",
  guideOpen: "Hướng dẫn",
  guideTitle: "Cách xem thiệp",
  guideOk: "Đã hiểu",
  guidePinned:
    "Cảnh đã được ghim: bạn có thể đưa camera ra khỏi thiệp in, cảnh vẫn ở nguyên chỗ. Bấm “Bỏ ghim” để quét lại thiệp.",
  guideTurn: "Kéo ngang một ngón: xoay cảnh",
  guideTip: "Kéo lên, xuống một ngón: nghiêng cảnh",
  guideMove: "Kéo hai ngón: di chuyển cảnh",
  guideMoveOne: "Kéo một ngón: di chuyển thiệp",
  guideSize: "Chụm hoặc mở hai ngón: thu nhỏ, phóng to",
  guideOrbit: "Kéo một ngón: xoay quanh cảnh",
  guideZoom: "Chụm hoặc mở hai ngón: lại gần, ra xa",
  guideTap: "Chạm vào màn hình: xem tiếp",
  guidePhoto: "Chạm vào một tấm ảnh: xem ảnh lớn",
  soundOff: "Tắt tiếng",
  soundOn: "Bật tiếng",
  closePhoto: "Đóng ảnh",
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
