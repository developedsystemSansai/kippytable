import { LOGO_MARK } from "@/lib/art";

/** Kippy logo: the mascot mark and the lower-case wordmark. `size` is the wordmark size in px. */
export default function Logo({ size = 22, markless = false }: { size?: number; markless?: boolean }) {
  const h = Math.round(size * 1.6);
  // eslint-disable-next-line @next/next/no-img-element
  const mark = <img src="/kippy/logo-mark.webp" alt="" height={h} width={Math.round((h * LOGO_MARK[0]) / LOGO_MARK[1])} draggable={false} />;
  return (
    <span className="logo" role="img" aria-label="Kippy" style={{ fontSize: size }}>
      {!markless && mark}
      <span aria-hidden>kippy</span>
    </span>
  );
}
