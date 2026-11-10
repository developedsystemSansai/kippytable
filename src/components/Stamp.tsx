import { ICON_SIZE, symbolForShift } from "@/lib/art";
import { inkOn, shiftCode } from "@/lib/shift";

type Props = { label?: string; color?: string; size?: "sm" | "md" | "lg" };

/**
 * The roster stamp. Known shifts show a symbol (sun, cloud-sun, moon, clock+, umbrella) in a ring of the
 * shift colour; custom shifts show a letter disc. No label => empty dashed ring.
 */
export default function Stamp({ label, color, size = "md" }: Props) {
  if (!label || !color) return <span className={`stamp ${size} is-empty`} aria-hidden>+</span>;
  const symbol = symbolForShift(label);
  if (symbol) {
    const [w, h] = ICON_SIZE[symbol];
    return (
      <span className={`stamp sym ${size}`} style={{ ["--c" as string]: color }} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="kicon" src={`/kippy/icons/${symbol}.webp`} alt="" width={w} height={h} draggable={false} />
      </span>
    );
  }
  const code = shiftCode(label);
  return (
    <span className={`stamp ${size}`} data-long={Array.from(code).length > 1}
      style={{ background: color, color: inkOn(color) }} aria-hidden>
      {code}
    </span>
  );
}
