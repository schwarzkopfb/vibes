# vibes - side quests nobody asked for

A collection of public pet projects, some quick 1-minute experiments, some a bit more complex. Just my personal playground, nothing interesting.

## Overview

This repository contains a tiny router (`main.ts`) that routes incoming traffic to related sub-apps. Each sub-app lives in its own directory and can be accessed via its route path.

## Running

Start the server:

```bash
deno run -A main.ts
```

Then visit `http://localhost:8000/` to see the index page with links to all available sub-apps.

## Projects

- [`/screen-constellation`](./screen-constellation/) - Multi-window graph visualization

## Adding a New Project

1. Create a new directory for your project
2. Add a route handler in `main.ts`:

   ```typescript
   import yourProjectHandler from "./your-project/main.ts";

   const routes = {
     "/your-project": yourProjectHandler,
     // ... other routes
   };
   ```

3. Implement your project's `main.ts` that exports a request handler function
