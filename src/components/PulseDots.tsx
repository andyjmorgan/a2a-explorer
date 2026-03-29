export function PulseDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          style={{
            animation: "pulse-dot 1.4s infinite ease-in-out",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}
