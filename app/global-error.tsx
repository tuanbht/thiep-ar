"use client";
/* When even the root layout fails: a page of its own (no global styles reach it), plain and calm. */
export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b1030",
          color: "#f6eedb",
          fontFamily: "Georgia, serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <div>
          <title>Có gì đó trục trặc</title>
          <h1
            style={{
              fontFamily: '"Arial Narrow", sans-serif',
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Có gì đó trục trặc
          </h1>
          <p style={{ fontStyle: "italic", opacity: 0.8 }}>
            Trang chưa tải được. Thử lại nhé.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              borderRadius: 999,
              border: 0,
              background: "#c8372d",
              color: "#f6eedb",
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
