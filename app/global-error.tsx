"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          background: "#F6F1E6",
          color: "#1B1612",
          fontFamily: "ui-serif, Georgia, Cambria, serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <p style={{ fontSize: 15, marginBottom: 16 }}>
            Something went wrong. We&apos;ve been notified.
          </p>
          <button
            onClick={reset}
            style={{
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: 13,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #E6DCC8",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
