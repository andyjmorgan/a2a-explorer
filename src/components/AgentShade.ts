// Twelve named gradient shades the user can pick for an agent's icon.
// Centralised here so AgentCardsGrid, AgentsSidebar, ChatPanel header, and the
// wizard preview all stay in lockstep.

export type AgentShadeId =
  | "cyan"
  | "blue"
  | "violet"
  | "fuchsia"
  | "pink"
  | "rose"
  | "red"
  | "amber"
  | "lime"
  | "emerald"
  | "teal"
  | "slate";

export interface AgentShade {
  id: AgentShadeId;
  label: string;
  /** Tailwind classes producing the gradient. */
  gradient: string;
  /** Tailwind class for a glow shadow that matches the shade. */
  glow: string;
}

export const AGENT_SHADES: readonly AgentShade[] = [
  { id: "cyan", label: "Cyan", gradient: "from-cyan-500 to-blue-600", glow: "shadow-cyan-500/25" },
  { id: "blue", label: "Blue", gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/25" },
  { id: "violet", label: "Violet", gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/25" },
  { id: "fuchsia", label: "Fuchsia", gradient: "from-fuchsia-500 to-pink-600", glow: "shadow-fuchsia-500/25" },
  { id: "pink", label: "Pink", gradient: "from-pink-500 to-rose-500", glow: "shadow-pink-500/25" },
  { id: "rose", label: "Rose", gradient: "from-rose-500 to-red-500", glow: "shadow-rose-500/25" },
  { id: "red", label: "Red", gradient: "from-red-500 to-orange-500", glow: "shadow-red-500/25" },
  { id: "amber", label: "Amber", gradient: "from-amber-500 to-yellow-500", glow: "shadow-amber-500/25" },
  { id: "lime", label: "Lime", gradient: "from-lime-500 to-emerald-500", glow: "shadow-lime-500/25" },
  { id: "emerald", label: "Emerald", gradient: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/25" },
  { id: "teal", label: "Teal", gradient: "from-teal-500 to-cyan-600", glow: "shadow-teal-500/25" },
  { id: "slate", label: "Slate", gradient: "from-slate-500 to-zinc-600", glow: "shadow-slate-500/25" },
];

export const DEFAULT_SHADE: AgentShadeId = "cyan";

export function shadeOf(id: AgentShadeId | string | null | undefined): AgentShade {
  return AGENT_SHADES.find((s) => s.id === id) ?? AGENT_SHADES[0];
}
