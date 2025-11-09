import { dedent } from "@std/text/unstable-dedent";
import screenConstellationRequestHandler from "./screen-constellation/main.ts";

const routes = {
  "/screen-constellation": screenConstellationRequestHandler,
  "/": indexRoute, // keep this last, otherwise it will match all paths
};

Deno.serve(async (req: Request) => {
  const { pathname } = new URL(req.url);

  for (const [path, handler] of Object.entries(routes)) {
    if (pathname.startsWith(path)) {
      return await handler(req);
    }
  }

  return notFoundRoute();
});

function indexRoute() {
  return new Response(
    dedent`
    <html>
      <head>
        <title>vibes</title>
        <style>
          body {
            font-family: sans-serif;
          }
        </style>
      </head>
      <body>
        <h1>vibes</h1>
        <p>side quests nobody asked for</p>
        <ul style="list-style: none; padding: 30px 0;">
          ${Object.keys(routes)
            .slice(0, -1) // don't list the index route
            .map((path) => `<li><a href="${path}">${path}</a></li>`)
            .join("")}
        </ul>
        <footer>
          <p>&copy; ${new Date().getFullYear()} <a href="https://github.com/schwarzkopfb">@schwarzkopfb</a></p>
        </footer>
      </body>
    </html>
  `,
    { headers: { "Content-Type": "text/html" } }
  );
}

function notFoundRoute() {
  return new Response("Not found", { status: 404 });
}
