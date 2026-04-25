interface PulseDotsProps {
  color?: string;
  size?: string;
}

export function PulseDots({
  color = "bg-cyan-400",
  size = "w-1 h-1",
}: PulseDotsProps) {
  return (
    <span className="inline-flex items-center gap-[3px] dot-bounce" aria-label="Loading">
      <span className={`rounded-full ${color} ${size}`} />
      <span className={`rounded-full ${color} ${size}`} />
      <span className={`rounded-full ${color} ${size}`} />
    </span>
  );
}
