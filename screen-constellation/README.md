# Screen Constellation - Multi-Window Graph Visualization

A real-time collaborative graph visualization where each browser window appears as a node. Nodes move in organic patterns and connect to nearby nodes, creating a dynamic network that syncs across windows via BroadcastChannel API.

![screen-constellation](https://github.com/user-attachments/assets/b1af39a2-f5d7-4fea-827b-035e8e1d062e)

## Try It Out

Open `dist/index.html` in multiple browser windows and move them around. Each window represents a node that connects to the 3 nearest nodes, creating a live graph visualization.

**Quick start:**

```bash
cd screen-constellation
deno bundle --outdir dist src/index.html
deno run -A ./main.ts
```

Then open `http://localhost:8000/screen-constellation/` in multiple windows.

## Features

- Real-time multi-window synchronization
- Organic node movement patterns
- Dynamic edge connections based on proximity
- Responsive canvas with device pixel ratio support
