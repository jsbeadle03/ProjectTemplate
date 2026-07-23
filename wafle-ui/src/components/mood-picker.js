"use client";

const moods = [
  { score: 1, label: "Struggling", color: "#C1554E" },
  { score: 2, label: "Low", color: "#D77C50" },
  { score: 3, label: "Okay", color: "#E8B04B" },
  { score: 4, label: "Good", color: "#9EAF62" },
  { score: 5, label: "Great", color: "#5E9E6E" },
];

export function MoodPicker({ value, onChange, compact = false }) {
  return (
    <fieldset className={compact ? "mood-fieldset compact" : "mood-fieldset"}>
      <legend className="sr-only">Choose a mood from one to five</legend>
      <div className="mood-picker">
        {moods.map((mood) => (
          <button
            aria-label={`${mood.score}: ${mood.label}`}
            aria-pressed={value === mood.score}
            className={value === mood.score ? "mood-tile selected" : "mood-tile"}
            key={mood.score}
            onClick={() => onChange(mood.score)}
            style={{ "--mood-color": mood.color }}
            type="button"
          >
            <span>{mood.score}</span>
            <small>{mood.label}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
