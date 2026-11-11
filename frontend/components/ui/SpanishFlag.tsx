/** Drawn as SVG because Windows does not show flag emojis (🇪🇸 appears as the letters "ES"). */
export default function SpanishFlag({ width = 34 }: { width?: number }) {
  return (
    <svg
      viewBox="0 0 36 26"
      width={width}
      height={(width * 26) / 36}
      aria-hidden="true"
      className="inline-block rounded-md border-2 border-line align-middle"
    >
      <rect width="36" height="26" fill="#c60b1e" />
      <rect y="6.5" width="36" height="13" fill="#ffc400" />
    </svg>
  );
}
