// Create the Kippy rich menu through the LINE Messaging API (Node 18+).
//   export LINE_CHANNEL_ACCESS_TOKEN="<token of the Messaging API channel>"   # never commit or paste it in chat
//   node richmenu/create-richmenu.mjs                       # create + upload image + set as default for all friends
//   node richmenu/create-richmenu.mjs --image richmenu/richmenu-2500x843.jpg   # use the plain image instead
//   node richmenu/create-richmenu.mjs --list                # list existing rich menus
//   node richmenu/create-richmenu.mjs --delete richmenu-xxxxxxxx
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) { console.error("Set LINE_CHANNEL_ACCESS_TOKEN first."); process.exit(1); }
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const auth = { Authorization: `Bearer ${TOKEN}` };

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) { console.error(`${init.method ?? "GET"} ${url} -> ${res.status}\n${text}`); process.exit(1); }
  return text ? JSON.parse(text) : {};
}

if (args.includes("--list")) {
  const { richmenus } = await call("https://api.line.me/v2/bot/richmenu/list");
  for (const m of richmenus) console.log(m.richMenuId, "|", m.name, "|", m.size.width + "x" + m.size.height);
  const def = await call("https://api.line.me/v2/bot/user/all/richmenu").catch(() => ({}));
  console.log("default:", def.richMenuId ?? "(none)");
  process.exit(0);
}
if (arg("--delete")) {
  await call(`https://api.line.me/v2/bot/richmenu/${arg("--delete")}`, { method: "DELETE" });
  console.log("deleted", arg("--delete"));
  process.exit(0);
}

const imagePath = arg("--image") ?? join(here, "richmenu-2500x843-labeled.jpg");
const body = JSON.parse(await readFile(join(here, "richmenu.json"), "utf8"));
const image = await readFile(imagePath);
if (image.length > 1024 * 1024) { console.error("Image is over 1 MB."); process.exit(1); }

const { richMenuId } = await call("https://api.line.me/v2/bot/richmenu", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
console.log("created", richMenuId);

await call(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST", headers: { "Content-Type": imagePath.endsWith(".png") ? "image/png" : "image/jpeg" }, body: image,
});
console.log("image uploaded");

await call(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST" });
console.log("set as default for all friends. Done.");
