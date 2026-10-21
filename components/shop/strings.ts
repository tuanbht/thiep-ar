/* Every word the shop says, in one place (Vietnamese: the buyers pay in VND). The cards' own words come from their
   templates (form.json) and are shown as they are. */
export const S = {
  brand: "Bưu cục Đêm",
  brandSub: "Thiệp AR",
  tagline: "Thiệp in sống dậy trên điện thoại",
  nav: { shop: "Kệ thiệp", how: "Cách dùng", contact: "Liên hệ" },
  skip: "Bỏ qua, tới nội dung",

  home: {
    eyebrow: "Mở cửa sau khi trời tối",
    title: ["Gửi một", "lá thư", "biết cử động"],
    lead: "Chọn một tấm thiệp, viết lời của bạn, xem nó diễn ngay trên màn hình. Người nhận chỉ cần hướng điện thoại vào tấm thiệp in: nhân vật bước ra, chúc mừng, rồi trao lá thư bạn viết.",
    cta: "Chọn thiệp",
    stepsTitle: "Ba bước, một buổi tối",
    steps: [
      {
        n: "01",
        title: "Viết",
        body: "Chọn thiệp, viết lời trên bảng, lá thư cuối và thêm một tấm ảnh nếu muốn.",
      },
      {
        n: "02",
        title: "Xem trước",
        body: "Màn diễn chạy ngay bên cạnh khi bạn gõ: xoay, xem từ mọi phía trước khi mua.",
      },
      {
        n: "03",
        title: "Gửi",
        body: "Thanh toán xong, bạn nhận một đường link riêng và mã QR để in kèm tấm thiệp.",
      },
    ],
    shelfTitle: "Kệ thiệp",
    shelfLead: "Mỗi tấm có bản in riêng: điện thoại nhận ra đúng tấm thiệp đó.",
    groups: { "3d": "Màn diễn 3D", film: "Phim trên thiệp" },
    empty: "Kệ đang trống. Quay lại sau một chút nhé.",
    unavailable: "Chưa mở được kệ thiệp. Thử tải lại trang.",
    search: {
      label: "Tìm thiệp",
      placeholder: "mưa, biển, cầu hôn, sinh nhật…",
      clear: "Xoá chữ đã gõ",
      categories: "Chủ đề",
      all: "Tất cả",
      found: (n: number) => `${n} thiệp`,
      forWords: (q: string) => `cho “${q}”`,
      inCategory: (name: string) => `trong ${name}`,
      reset: "Xem cả kệ",
      none: "Chưa có tấm thiệp nào như vậy.",
      noneHint: "Thử một từ khác, hoặc chọn một chủ đề bên trên.",
    },
  },

  kind: { "3d": "Diễn 3D", film: "Phim" },
  from: "Từ",

  product: {
    back: "Về kệ thiệp",
    write: "Viết thiệp",
    preview: "Xem trước",
    previewNote: "Chạy lại mỗi khi bạn sửa lời.",
    showPreview: "Hiện bản xem trước",
    hidePreview: "Ẩn bản xem trước",
    sections: {
      opening: "Màn mở đầu",
      openingNote: "Người nhận thấy dòng này trước khi bật camera.",
      words: "Lời trên thiệp",
      letter: "Lá thư cuối",
      letterNote: "Mở ra sau điểm dừng cuối cùng.",
      photo: "Ảnh của bạn",
      photoNote:
        "Không bắt buộc. Tối đa 10 ảnh JPG, PNG hoặc WebP, mỗi ảnh tối đa 5 MB.",
    },
    fields: {
      title: "Tiêu đề",
      intro: "Lời dẫn",
      to: "Lời mở thư",
      paragraph: "Đoạn",
      addParagraph: "Thêm đoạn",
      removeParagraph: "Bỏ đoạn này",
      from: "Lời ký tên",
      removePhoto: "Bỏ ảnh",
      uploading: "Đang tải ảnh lên…",
      addPhotos: "Thêm ảnh",
      photoN: (n: number) => `Ảnh ${n}`,
      removePhotoN: (n: number) => `Bỏ ảnh ${n}`,
      uploadingShort: "đang tải…",
      photosCount: (n: number, max: number) => `${n}/${max} ảnh`,
      photoPlaces: (n: number) =>
        n === 0
          ? "Ảnh của bạn sẽ nằm trong lá thư cuối thiệp."
          : n === 1
            ? "Ảnh của bạn thay nhau hiện trong khung ảnh của thiệp, và nằm trong lá thư cuối."
            : `Thiệp có ${n} chỗ cho ảnh: mỗi lần mở, ảnh được xếp ngẫu nhiên; chỗ nào chưa có ảnh của bạn sẽ giữ hình có sẵn.`,
    },
    required: "Cần điền",
    tooLong: (max: number) => `Tối đa ${max} ký tự`,
    buy: "Mua thiệp",
    buying: "Đang tạo đơn…",
    waitPhoto: "Ảnh vẫn đang tải lên. Đợi một chút rồi bấm Mua nhé.",
    total: "Tổng",
    fixErrors: "Còn vài chỗ cần sửa phía trên.",
    photoTooBig: "Ảnh lớn hơn 5 MB.",
    photoType: "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
    photoFailed: "Chưa tải được ảnh lên. Thử lại nhé.",
    photosTooMany: (max: number) =>
      `Mỗi thiệp nhận tối đa ${max} ảnh: những ảnh sau đã được bỏ qua.`,
    orderFailed: "Chưa tạo được đơn. Thử lại sau một chút.",
    noForm: "Tấm thiệp này chưa mở bán.",
    draft: {
      idle: "Bản nháp tự lưu trên máy này",
      saved: (when: string) => `Đã lưu nháp ${when}`,
      savedWithoutPhotos: (when: string) =>
        `Đã lưu nháp ${when}, nhưng máy hết chỗ giữ ảnh`,
      restored: (when: string) => `Đã mở lại bản nháp ${when}`,
      failed: "Máy này không lưu được bản nháp",
      photosLost: (n: number) =>
        `${n} ảnh của bản nháp không mở lại được, bạn thêm lại nhé.`,
      startOver: "Viết lại từ đầu",
      confirm: "Bấm lần nữa để xoá",
    },
  },

  checkout: {
    eyebrow: "Phiếu gửi",
    title: "Thanh toán",
    code: "Mã đơn",
    card: "Tấm thiệp",
    amount: "Số tiền",
    recipientSees: "Người nhận sẽ thấy",
    pay: "Thanh toán",
    paying: "Đang chuyển…",
    gatewayNotice: "Bạn sẽ được chuyển sang cổng thanh toán, rồi quay lại đây.",
    qrTitle: "Quét mã để chuyển khoản",
    qrHow:
      "Mở app ngân hàng, quét mã QR (hoặc chuyển khoản theo thông tin dưới đây). Đơn được xác nhận tự động khi tiền về.",
    qrAlt: "Mã QR chuyển khoản cho đơn này",
    qrBank: "Ngân hàng",
    qrAccount: "Số tài khoản",
    qrHolder: "Chủ tài khoản",
    qrAmount: "Số tiền",
    qrContent: "Nội dung",
    qrContentNote:
      "Giữ nguyên nội dung chuyển khoản để đơn được xác nhận tự động.",
    qrWaiting: "Đang chờ tiền về… trang sẽ tự chuyển khi thanh toán xong.",
    qrGaveUp: "Chưa thấy tiền về. Nếu bạn đã chuyển, bấm Kiểm tra lại.",
    qrCheckAgain: "Kiểm tra lại",
    copy: "Chép",
    copied: "Đã chép",
    payFailed: "Chưa thanh toán được. Thử lại nhé.",
    alreadyPaid: "Đơn này đã thanh toán.",
    seeOrder: "Xem đơn",
    edit: "Sửa lại thiệp",
  },

  order: {
    eyebrow: "Đơn",
    pendingTitle: "Đang chờ thanh toán",
    pendingBody: "Trang này tự cập nhật khi thanh toán xong.",
    paidTitle: "Thiệp đã sẵn sàng",
    paidBody:
      "Đây là đường link riêng của tấm thiệp. Ai có link này đều mở được thiệp, nên chỉ gửi cho người nhận.",
    failedTitle: "Thanh toán chưa thành công",
    failedBody: "Đơn chưa được thanh toán. Bạn có thể thử lại.",
    cancelledTitle: "Đơn đã huỷ",
    refundedTitle: "Đơn đã hoàn tiền",
    timeout:
      "Vẫn chưa thấy thanh toán. Bấm Kiểm tra lại sau ít phút, hoặc liên hệ chúng tôi kèm mã đơn.",
    checkAgain: "Kiểm tra lại",
    retry: "Thanh toán lại",
    copy: "Chép link",
    copied: "Đã chép",
    open: "Mở thiệp",
    share: "Gửi link",
    qr: "Mã QR của thiệp",
    howTitle: "Gửi thiệp thế nào",
    how: [
      "In tấm thiệp (hoặc nhận bản in từ chúng tôi) và dán mã QR ở mặt sau.",
      "Người nhận quét mã QR, cho phép dùng camera.",
      "Hướng điện thoại vào tấm thiệp in: màn diễn bắt đầu, chạm để đi tiếp, cuối cùng là lá thư.",
    ],
    paidAt: "Thanh toán lúc",
    amount: "Số tiền",
  },

  access: {
    title: "Đơn này được đặt trên trình duyệt khác",
    body: "Vì an toàn, chỉ trình duyệt đã đặt đơn mới xem được đơn và link thiệp. Hãy mở lại trên máy đó.",
    home: "Về kệ thiệp",
  },

  gift: {
    loading: "Đang mở thiệp…",
    goneTitle: "Không tìm thấy tấm thiệp",
    goneBody: "Link có thể sai, hoặc thiệp chưa được thanh toán.",
  },

  notFound: {
    title: "Lá thư này lạc đường",
    body: "Trang bạn tìm không có ở đây.",
    home: "Về kệ thiệp",
  },
  error: {
    title: "Có gì đó trục trặc",
    body: "Một phần trang chưa tải được. Thử lại nhé.",
    retry: "Thử lại",
    home: "Về kệ thiệp",
  },
  loading: "Đang mở…",
  footer: {
    line: "Thiệp in, màn diễn trên điện thoại, lá thư viết tay của bạn.",
    note: "Không cần cài ứng dụng: mở bằng trình duyệt trên điện thoại.",
    contact: "Liên hệ",
  },

  help: {
    title: "Cần hỗ trợ?",
    body: "Nếu đơn hàng hay tấm thiệp có gì trục trặc, hãy liên hệ với chúng tôi và gửi kèm mã đơn",
    cta: "Liên hệ chúng tôi",
  },

  about: {
    title: "Về Bưu cục Đêm",
    eyebrow: "Về chúng tôi",
    lead: "Chúng tôi làm những tấm thiệp in biết cử động. Bạn chọn màn diễn, viết lời và lá thư; người nhận chỉ cần hướng điện thoại vào tấm thiệp, không cần cài ứng dụng.",
    contactTitle: "Liên hệ",
    contactBody:
      "Chưa thanh toán được, link thiệp không mở, hay camera không nhận ra tấm thiệp? Nhắn cho chúng tôi kèm mã đơn (dạng GC-…) để được giúp nhanh nhất.",
    email: "Email",
    zalo: "Zalo",
    zaloHow:
      "Mở Zalo, chọn Quét mã QR rồi quét mã này. Đang xem trên điện thoại: chụp màn hình, rồi trong Zalo chọn Quét mã › ảnh vừa chụp.",
    zaloAlt: "Mã QR Zalo của Bưu cục Đêm",
  },
} as const;
