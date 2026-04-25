import { Check } from "lucide-react";
import { AGENT_SHADES, type AgentShadeId } from "./AgentShade";

interface ShadePickerProps {
  value: AgentShadeId;
  onChange: (id: AgentShadeId) => void;
}

export function ShadePicker({ value, onChange }: ShadePickerProps) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
      {AGENT_SHADES.map((shade) => {
        const selected = shade.id === value;
        return (
          <button
            key={shade.id}
            type="button"
            onClick={() => onChange(shade.id)}
            aria-label={shade.label}
            aria-pressed={selected}
            title={shade.label}
            className={`relative h-9 rounded-xl bg-gradient-to-br ${shade.gradient} transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
              selected ? "ring-2 ring-foreground/80 scale-105" : ""
            }`}
          >
            {selected && <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />}
          </button>
        );
      })}
    </div>
  );
}
