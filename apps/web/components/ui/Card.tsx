import type { ReactNode } from "react";

export interface CardProps {
  title?: ReactNode;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        boxShadow: "var(--shadow)",
        padding: 24,
      }}
    >
      {title !== undefined && (
        <header
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          {title}
        </header>
      )}
      {children}
    </section>
  );
}
