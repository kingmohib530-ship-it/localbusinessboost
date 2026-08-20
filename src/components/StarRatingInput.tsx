import { Star } from "lucide-react";

interface StarRatingInputProps {
  rating: number;
  onChange?: (n: number) => void;
  size?: number;
}

/** Shared 1-5 star picker/display, used anywhere a review star rating needs to render - reads real Lucide icons instead of a raw text character, filled up to the given rating. */
export function StarRatingInput({ rating, onChange, size = 20 }: StarRatingInputProps) {
  // Only the interactive (onChange) case needs a real touch target - a
  // disabled display-only star has nothing to tap, so padding it out would
  // just bloat every compact read-only rating shown in a list row.
  const hitPadding = onChange ? Math.max(0, (44 - size) / 2) : 0;
  return (
    <div style={{ display: "flex", gap: onChange ? 0 : 4, margin: onChange ? -hitPadding : 0 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          style={{
            background: "none",
            border: "none",
            padding: hitPadding,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: onChange ? "pointer" : "default",
          }}
        >
          <Star
            size={size}
            color={n <= rating ? "var(--primary)" : "var(--border)"}
            fill={n <= rating ? "var(--primary)" : "none"}
            strokeWidth={1.75}
          />
        </button>
      ))}
    </div>
  );
}
