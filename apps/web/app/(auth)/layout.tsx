import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-app)",
        color: "var(--text-primary)",
        padding: "32px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>{children}</div>
    </div>
  );
}
