import type { ReactNode } from "react";
import { Fraunces } from "next/font/google";
import { AuthCompactBrand } from "../../components/auth/BrandPanel";

// Fraunces is scoped to the (auth) route group only (brand headline,
// wordmark, form title); everything else in the app stays Inter.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Full-viewport two-column grid for /login and /register: the brand panel
 * (`1.05fr`, left) and the form column (`1fr`, right). The page renders both
 * columns itself — `BrandPanel` pins itself to column 1, and every other
 * child lands in column 2. Below 900px the grid collapses to one column, the
 * brand panel hides itself, and the compact logo + product name sit above
 * the form column.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} grid min-h-screen w-full content-start min-[900px]:content-stretch min-[900px]:grid-cols-[1.05fr_1fr] min-[900px]:*:col-start-2`}
      style={{
        background: "var(--bg-app)",
        color: "var(--text-primary)",
      }}
    >
      <AuthCompactBrand />
      {children}
    </div>
  );
}
