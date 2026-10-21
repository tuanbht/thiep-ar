/* How a buyer reaches the shop when an order or a card goes wrong: an email, and the shop's Zalo QR code (saved from
   the Zalo app: Cá nhân > Mã QR của tôi > Lưu, as public/contact/zalo-qr.png, .jpg or .webp). */
export const CONTACT = {
  email: "tuanbht@outlook.com",
  /** where the contact section lives */
  page: "/about#lien-he",
} as const;

export const ZALO_QR_FILES = [
  "zalo-qr.png",
  "zalo-qr.jpg",
  "zalo-qr.webp",
] as const;
