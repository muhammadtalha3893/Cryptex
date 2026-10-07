export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="group relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg,#312e81 0%,#4f46e5 45%,#0ea5e9 100%)',
        boxShadow: '0 4px 14px -4px rgba(79,70,229,.55), inset 0 1px 0 rgba(255,255,255,.25)',
      }}
      aria-hidden="true"
    >
      {/* rotating cylinder ticks */}
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        className="absolute inset-0 transition-transform duration-700 ease-out group-hover:rotate-90"
        style={{ animation: undefined }}
      >
        <g stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6;
            const r1 = 15.5;
            const r2 = i % 3 === 0 ? 18.2 : 17;
            const cx = 20 + Math.cos(a) * ((r1 + r2) / 2);
            const cy = 20 + Math.sin(a) * ((r1 + r2) / 2);
            const x1 = 20 + Math.cos(a) * r1;
            const y1 = 20 + Math.sin(a) * r1;
            const x2 = 20 + Math.cos(a) * r2;
            const y2 = 20 + Math.sin(a) * r2;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} data-cx={cx} data-cy={cy} />;
          })}
        </g>
        <circle cx="20" cy="20" r="13.2" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.4" />
      </svg>
      {/* hash symbol fused in center */}
      <svg viewBox="0 0 40 40" width={size} height={size} className="absolute inset-0">
        <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
          <line x1="15.5" y1="11" x2="13" y2="29" />
          <line x1="27" y1="11" x2="24.5" y2="29" />
          <line x1="10.5" y1="16.5" x2="29.5" y2="16.5" />
          <line x1="10.5" y1="23.5" x2="29.5" y2="23.5" />
        </g>
        <circle cx="20" cy="20" r="4.2" fill="#0ea5e9" stroke="#fff" strokeWidth="1.6" />
        <circle cx="20" cy="20" r="1.4" fill="#fff" />
      </svg>
    </span>
  );
}
