import { POSE_SIZE, type Pose } from "@/lib/art";

/** Kippy in one of the poses. `size` is the rendered height in px. Animated by CSS (see globals.css). */
export default function Mascot({ pose, size = 72, alt = "" }: { pose: Pose; size?: number; alt?: string }) {
  const [w, h] = POSE_SIZE[pose];
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="mascot" data-pose={pose} src={`/kippy/mascot/${pose}.webp`} alt={alt} height={size} width={Math.round((size * w) / h)} draggable={false} />;
}
