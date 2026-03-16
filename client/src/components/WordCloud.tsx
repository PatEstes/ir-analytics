/**
 * WordCloud.tsx — SVG-based word cloud visualization
 * Renders terms sized by frequency with the Observatory design theme.
 * Uses a deterministic spiral placement algorithm for consistent layouts.
 */

import { useMemo, useState } from "react";
import type { TermFrequency } from "@/lib/nlp/termFrequency";

interface WordCloudProps {
  /** Array of term frequencies to display */
  terms: TermFrequency[];
  /** Width of the SVG canvas */
  width?: number;
  /** Height of the SVG canvas */
  height?: number;
  /** Optional: currently selected topic name (for highlighting) */
  selectedTopic?: string | null;
  /** Callback when a word is clicked */
  onWordClick?: (term: string) => void;
}

// Observatory theme colors — cyan/teal palette with accent variations
const WORD_COLORS = [
  "#22d3ee", // cyan-400
  "#06b6d4", // cyan-500
  "#0891b2", // cyan-600
  "#34d399", // emerald-400
  "#2dd4bf", // teal-400
  "#818cf8", // indigo-400
  "#a78bfa", // violet-400
  "#38bdf8", // sky-400
  "#67e8f9", // cyan-300
  "#5eead4", // teal-300
];

interface PlacedWord {
  term: string;
  count: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  rotation: number;
  weight: number;
}

/**
 * Simple bounding box collision detection.
 */
function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  padding: number = 4
): boolean {
  return !(
    a.x + a.w + padding < b.x ||
    b.x + b.w + padding < a.x ||
    a.y + a.h + padding < b.y ||
    b.y + b.h + padding < a.y
  );
}

/**
 * Estimate the bounding box of a word given its font size.
 * Uses approximate character width ratios.
 */
function estimateBBox(
  term: string,
  fontSize: number,
  rotation: number
): { w: number; h: number } {
  const charWidth = fontSize * 0.58;
  const textWidth = term.length * charWidth;
  const textHeight = fontSize * 1.2;

  if (rotation !== 0) {
    // Rotated text swaps width/height approximately
    return { w: textHeight, h: textWidth };
  }
  return { w: textWidth, h: textHeight };
}

/**
 * Place words using an Archimedean spiral from the center.
 */
function placeWords(
  terms: TermFrequency[],
  width: number,
  height: number
): PlacedWord[] {
  const MIN_FONT = 11;
  const MAX_FONT = 42;
  const placed: PlacedWord[] = [];
  const boxes: { x: number; y: number; w: number; h: number }[] = [];

  const cx = width / 2;
  const cy = height / 2;

  for (let i = 0; i < terms.length; i++) {
    const { term, count, weight } = terms[i];
    const fontSize = MIN_FONT + weight * (MAX_FONT - MIN_FONT);
    // Only rotate some words (every 4th word, and only smaller ones)
    const rotation = i % 5 === 3 && weight < 0.5 ? -90 : 0;
    const color = WORD_COLORS[i % WORD_COLORS.length];
    const bbox = estimateBBox(term, fontSize, rotation);

    // Spiral placement
    let placed_ok = false;
    for (let t = 0; t < 600; t++) {
      const angle = t * 0.15;
      const radius = 3 + t * 0.8;
      const x = cx + radius * Math.cos(angle) - bbox.w / 2;
      const y = cy + radius * Math.sin(angle) - bbox.h / 2;

      // Check bounds
      if (x < 0 || y < 0 || x + bbox.w > width || y + bbox.h > height) {
        continue;
      }

      // Check collisions
      const candidate = { x, y, w: bbox.w, h: bbox.h };
      let collision = false;
      for (const existing of boxes) {
        if (boxesOverlap(candidate, existing)) {
          collision = true;
          break;
        }
      }

      if (!collision) {
        boxes.push(candidate);
        placed.push({
          term,
          count,
          x: x + bbox.w / 2,
          y: y + bbox.h / 2,
          fontSize,
          color,
          rotation,
          weight,
        });
        placed_ok = true;
        break;
      }
    }

    // If we couldn't place it, skip
    if (!placed_ok && i < 15) {
      // Try placing at a random offset for important words
      const x = cx + (Math.random() - 0.5) * width * 0.6;
      const y = cy + (Math.random() - 0.5) * height * 0.4;
      placed.push({
        term,
        count,
        x,
        y,
        fontSize: Math.max(MIN_FONT, fontSize * 0.8),
        color,
        rotation: 0,
        weight,
      });
    }
  }

  return placed;
}

export default function WordCloud({
  terms,
  width = 600,
  height = 350,
  onWordClick,
}: WordCloudProps) {
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);

  const placedWords = useMemo(
    () => placeWords(terms, width, height),
    [terms, width, height]
  );

  if (terms.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ width, height }}
      >
        No terms to display
      </div>
    );
  }

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="select-none"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {placedWords.map((word) => (
        <text
          key={word.term}
          x={word.x}
          y={word.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={word.fontSize}
          fill={word.color}
          opacity={
            hoveredTerm === null
              ? 0.7 + word.weight * 0.3
              : hoveredTerm === word.term
                ? 1
                : 0.2
          }
          transform={
            word.rotation !== 0
              ? `rotate(${word.rotation}, ${word.x}, ${word.y})`
              : undefined
          }
          style={{
            cursor: onWordClick ? "pointer" : "default",
            transition: "opacity 0.2s ease, font-size 0.2s ease",
            fontWeight: word.weight > 0.6 ? 700 : word.weight > 0.3 ? 500 : 400,
          }}
          onMouseEnter={() => setHoveredTerm(word.term)}
          onMouseLeave={() => setHoveredTerm(null)}
          onClick={() => onWordClick?.(word.term)}
        >
          {word.term}
        </text>
      ))}

      {/* Tooltip */}
      {hoveredTerm && (() => {
        const word = placedWords.find((w) => w.term === hoveredTerm);
        if (!word) return null;
        const tooltipText = `${word.term}: ${word.count} occurrences`;
        const tooltipWidth = tooltipText.length * 7 + 16;
        const tooltipX = Math.min(Math.max(word.x - tooltipWidth / 2, 4), width - tooltipWidth - 4);
        const tooltipY = word.y - word.fontSize / 2 - 28;
        return (
          <g>
            <rect
              x={tooltipX}
              y={Math.max(4, tooltipY)}
              width={tooltipWidth}
              height={24}
              rx={4}
              fill="rgba(15, 23, 42, 0.9)"
              stroke="rgba(34, 211, 238, 0.3)"
              strokeWidth={1}
            />
            <text
              x={tooltipX + tooltipWidth / 2}
              y={Math.max(4, tooltipY) + 16}
              textAnchor="middle"
              fontSize={11}
              fill="#e2e8f0"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {tooltipText}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
