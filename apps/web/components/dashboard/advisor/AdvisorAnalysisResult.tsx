import { Card } from "../../ui/Card";
import type { AdvisorAnalysis } from "../../../lib/types";

export interface AdvisorAnalysisResultProps {
  analysis: AdvisorAnalysis;
}

const SCORE_RING_TRACK_COLOR = "var(--border)";
const SCORE_RING_FILL_COLOR = "var(--emerald)";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

interface AnalysisColumnProps {
  title: string;
  accentColor: string;
  items: string[];
}

/**
 * One of the three `strengths`/`risks`/`recommendations` columns. These
 * arrive as `Json` Prisma columns — arrays at runtime with no
 * compile-time guarantee — so an empty array is rendered as an explicit
 * "none identified" state rather than a blank/missing column: a model
 * output with zero risks is a legitimate response, not a rendering bug.
 */
function AnalysisColumn({ title, accentColor, items }: AnalysisColumnProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: accentColor,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          None identified
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {items.map((item, index) => (
            <li
              key={index}
              style={{
                fontSize: 13.5,
                color: "var(--text-primary)",
                lineHeight: 1.5,
                padding: "8px 0",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Renders a persisted `AdvisorAnalysis`: score ring, summary, the three
 * strengths/risks/recommendations columns, and the impact metrics row,
 * per the mockup's AI Advisor panel. Purely presentational — takes the
 * analysis as a single prop and fetches nothing; `AdvisorPanel`
 * (`US-7_T-4`) owns the loading/analyze-button state around this.
 */
export function AdvisorAnalysisResult({ analysis }: AdvisorAnalysisResultProps) {
  const { score, summary, strengths, risks, recommendations, impactMetrics, model, createdAt } =
    analysis;

  // score is 0-10 (server-clamped, see specs/advisor/spec.md). Render the
  // ring as score / 10 of a turn, clamping defensively in case a stale
  // client ever receives an out-of-range value anyway.
  const clampedScore = Math.min(10, Math.max(0, score));
  const ringPct = (clampedScore / 10) * 100;
  const ringBackground = `conic-gradient(${SCORE_RING_FILL_COLOR} 0%, ${SCORE_RING_FILL_COLOR} ${ringPct}%, ${SCORE_RING_TRACK_COLOR} ${ringPct}%, ${SCORE_RING_TRACK_COLOR} 100%)`;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div
          data-testid="score-ring"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: ringBackground,
            flexShrink: 0,
          }}
        />
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Score
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            {score}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-tertiary)" }}>
              {" "}
              / 10
            </span>
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: 13.5,
          color: "var(--text-primary)",
          lineHeight: 1.6,
          marginTop: 0,
          marginBottom: 28,
        }}
      >
        {summary}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          marginBottom: 28,
        }}
      >
        <AnalysisColumn title="Strengths" accentColor="var(--emerald)" items={strengths} />
        <AnalysisColumn title="Risks" accentColor="var(--red)" items={risks} />
        <AnalysisColumn
          title="Recommendations"
          accentColor="var(--blue)"
          items={recommendations}
        />
      </div>

      {impactMetrics.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {impactMetrics.map((metric, index) => (
            <div
              key={index}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 14px",
                background: "var(--bg-card-alt)",
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginTop: 3,
                }}
              >
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        data-testid="advisor-analysis-footer"
        style={{
          fontSize: 11.5,
          color: "var(--text-tertiary)",
          borderTop: "1px solid var(--border)",
          paddingTop: 12,
        }}
      >
        Generated by {model} &middot; {dateFormatter.format(new Date(createdAt))}
      </div>
    </Card>
  );
}
