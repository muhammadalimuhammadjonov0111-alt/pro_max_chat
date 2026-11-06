import { Grand_Hotel } from "next/font/google";
import Link from "next/link";
import { cn } from "@/lib/utils";

const grand = Grand_Hotel({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-logo",
  display: "swap",
});

export function Wordmark({
  className,
  href = "/",
  onClick,
  link = true,
}: {
  className?: string;
  href?: string;
  onClick?: () => void;
  /** Set false to render plain text (use when the wordmark sits inside another link). */
  link?: boolean;
}) {
  const classes = cn(
    "brand-text select-none text-3xl font-semibold leading-none tracking-tight",
    grand.variable,
    className
  );
  const style = { fontFamily: "var(--font-logo), cursive" };

  if (!link) {
    return (
      <span className={classes} style={style}>
        Gidgogram
      </span>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={classes} style={style}>
      Gidgogram
    </Link>
  );
}
