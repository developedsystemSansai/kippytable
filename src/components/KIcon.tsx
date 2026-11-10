import { ICON_SIZE, type IconName } from "@/lib/art";

/** Kippy's illustrated icons. `size` is the rendered height in px. Decorative: pair with visible text. */
export default function KIcon({ name, size = 28 }: { name: IconName; size?: number }) {
  const [w, h] = ICON_SIZE[name];
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="kicon" src={`/kippy/icons/${name}.webp`} alt="" height={size} width={Math.round((size * w) / h)} draggable={false} />;
}
