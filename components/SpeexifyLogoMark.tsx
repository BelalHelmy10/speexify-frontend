type SpeexifyLogoMarkProps = {
  className?: string;
};

export default function SpeexifyLogoMark({
  className = "",
}: SpeexifyLogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        className="spx-logo-mark__background"
        x="18"
        y="18"
        width="476"
        height="476"
        rx="108"
      />
      <path
        className="spx-logo-mark__stroke"
        d="M256 82 C435 82 438 253 256 256 C74 259 76 430 256 430"
      />
    </svg>
  );
}
