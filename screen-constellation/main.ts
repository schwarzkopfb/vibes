import { serveDir } from "@std/http/file-server";
import { dirname, fromFileUrl, join } from "@std/path";

const STATIC_DIR = join(dirname(fromFileUrl(import.meta.url)), "dist");

export default function handler(req: Request) {
  return serveDir(req, {
    fsRoot: STATIC_DIR,
    urlRoot: "screen-constellation",
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
