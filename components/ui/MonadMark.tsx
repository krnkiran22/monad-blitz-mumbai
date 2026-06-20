export function MonadMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Monad's signature rhombus mark
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M50 4C32 4 4 32 4 50s28 46 46 46 46-28 46-46S68 4 50 4Zm0 70c-8 0-24-16-24-24s16-24 24-24 24 16 24 24-16 24-24 24Z"
        fill="#836EF9"
      />
    </svg>
  );
}

export function MonadCoin({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#6246ea] text-white font-black shadow-[0_0_12px_rgba(131,110,249,0.6)] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100" fill="none">
        <path
          d="M50 4C32 4 4 32 4 50s28 46 46 46 46-28 46-46S68 4 50 4Zm0 70c-8 0-24-16-24-24s16-24 24-24 24 16 24 24-16 24-24 24Z"
          fill="white"
        />
      </svg>
    </span>
  );
}
