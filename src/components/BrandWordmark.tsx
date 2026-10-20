import { GenieMark } from "./GenieMark";

type BrandWordmarkProps = {
  className?: string;
  markClassName?: string;
  /** Visuelt brand — skærmlæsere får navnet via parent-link eller aria-label */
  as?: "span" | "p";
};

export function BrandWordmark({
  className,
  markClassName,
  as: Tag = "span",
}: BrandWordmarkProps) {
  return (
    <Tag className={["brand-wordmark", className].filter(Boolean).join(" ")}>
      <GenieMark className={["brand-wordmark__mark", markClassName].filter(Boolean).join(" ")} />
      <span className="brand-wordmark__text">GaveGenie</span>
    </Tag>
  );
}
