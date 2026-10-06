import Link from "next/link";
import SpeexifyLogoMark from "@/components/SpeexifyLogoMark";

/** header = nav lockup (sizes come only from _header.scss — do not override) */
export type BrandLogoContext = "header" | "footer" | "auth" | "mark";

type BrandLogoProps = {
  context?: BrandLogoContext;
  href?: string;
  className?: string;
  wordmark?: string;
  ariaLabel?: string;
  onClick?: () => void;
};

function joinClasses(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function BrandLogo({
  context = "header",
  href,
  className = "",
  wordmark = "Speexify",
  ariaLabel = "Speexify",
  onClick,
}: BrandLogoProps) {
  const classes = joinClasses(
    context === "footer" && "spx-brand spx-brand--footer",
    context === "auth" && "spx-brand spx-brand--auth",
    context === "header" && "spx-brand",
    context === "mark" && "spx-brand spx-brand--mark-only",
    className
  );

  const content = (
    <>
      <SpeexifyLogoMark className="spx-brand-mark" />
      {context !== "mark" ? (
        <span className="spx-brand-text">{wordmark}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} aria-label={ariaLabel} onClick={onClick} role="img">
      {content}
    </span>
  );
}
