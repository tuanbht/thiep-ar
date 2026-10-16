/* What can go wrong in a request, as the API answers it. The messages are for the buyer (Vietnamese, plain); the
   details stay in the server's log. */

/** 404: no such order, product or gift (or one the caller may not know about). */
export class NotFound extends Error {
  constructor(message = 'Không tìm thấy.') { super(message); }
}

/** 403: the order belongs to another browser (no or a wrong access cookie). */
export class AccessDenied extends Error {
  constructor(message = 'Đơn hàng này được tạo trên một trình duyệt khác.') { super(message); }
}

/** 400: what was sent does not fit; `issues` says what, one line each. */
export class InvalidInput extends Error {
  constructor(readonly issues: string[]) { super(issues.join(' ')); }
}

/** 413: too large. */
export class TooLarge extends Error {}
