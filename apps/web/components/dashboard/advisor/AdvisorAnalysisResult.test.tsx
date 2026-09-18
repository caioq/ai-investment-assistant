import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdvisorAnalysisResult } from "./AdvisorAnalysisResult";
import type { AdvisorAnalysis } from "../../../lib/types";

const fullAnalysis: AdvisorAnalysis = {
  score: 7.2,
  summary: "A well-diversified portfolio with some sector concentration.",
  strengths: ["Broad sector diversification", "Low expense ratios"],
  risks: ["Heavy tech concentration", "No fixed income exposure"],
  recommendations: ["Add fixed income allocation", "Trim tech overweight"],
  impactMetrics: [
    { label: "Volatility reduction", value: "12.5%" },
    { label: "Expected drag", value: "-0.8%" },
  ],
  model: "claude-opus-4",
  createdAt: "2026-08-01T12:30:00.000Z",
};

describe("AdvisorAnalysisResult", () => {
  it("renders the summary, all three columns with items, impact metrics verbatim, and the numeric score", () => {
    render(<AdvisorAnalysisResult analysis={fullAnalysis} />);

    expect(screen.getByText(fullAnalysis.summary)).toBeInTheDocument();

    expect(screen.getByText("Strengths")).toBeInTheDocument();
    for (const s of fullAnalysis.strengths) {
      expect(screen.getByText(s)).toBeInTheDocument();
    }

    expect(screen.getByText("Risks")).toBeInTheDocument();
    for (const r of fullAnalysis.risks) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }

    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    for (const rec of fullAnalysis.recommendations) {
      expect(screen.getByText(rec)).toBeInTheDocument();
    }

    for (const metric of fullAnalysis.impactMetrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
      expect(screen.getByText(metric.value)).toBeInTheDocument();
    }

    expect(screen.getByText("7.2")).toBeInTheDocument();
  });

  it("renders a score of 0 as the literal text '0', not blank", () => {
    render(<AdvisorAnalysisResult analysis={{ ...fullAnalysis, score: 0 }} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders an empty-state message for a column with an empty array, without dropping other populated columns", () => {
    render(<AdvisorAnalysisResult analysis={{ ...fullAnalysis, risks: [] }} />);

    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText(/none identified/i)).toBeInTheDocument();

    expect(screen.getByText("Strengths")).toBeInTheDocument();
    for (const s of fullAnalysis.strengths) {
      expect(screen.getByText(s)).toBeInTheDocument();
    }

    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    for (const rec of fullAnalysis.recommendations) {
      expect(screen.getByText(rec)).toBeInTheDocument();
    }
  });

  it("shows the model and a formatted createdAt in the footer", () => {
    render(<AdvisorAnalysisResult analysis={fullAnalysis} />);

    expect(screen.getByText(/claude-opus-4/)).toBeInTheDocument();
    expect(screen.queryByText(fullAnalysis.createdAt)).not.toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});
