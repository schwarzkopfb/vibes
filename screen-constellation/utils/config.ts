export const BROADCAST_INTERVAL = 400;

export const COLORS = {
  BACKGROUND: "#fafafa",
  GRID: "#959596",
  NODE_SELF: "#8c8c8c",
  NODE_OTHER: "#aba9a9",
  EDGE: "#43464a",
} as const;

export const EDGE = {
  ALPHA_MIN: 0.04,
  ALPHA_MAX: 0.26,
  WIDTH_MIN: 0.4,
  WIDTH_MAX: 1.2,
} as const;

export const GRID = {
  ALPHA: 0.35,
  LINE_WIDTH: 0.5,
  STEP: 80,
} as const;

export const NODE = {
  ALPHA_OTHER: 0.85,
  ALPHA_SELF: 0.95,
  RADIUS_MIN: 8,
  RADIUS_OTHER: 3.2,
  RADIUS_RANGE: 24,
  RADIUS_SELF: 4.2,
  RADIUS_VARIATION: 0.4,
  SPEED_MIN: 0.35,
  SPEED_RANGE: 0.45,
} as const;

export const MAX_EDGES_PER_NODE = 3;
export const TIME_SCALE = 0.001;
export const WORLD_HEIGHT = 1080;
export const WORLD_WIDTH = 1920;
export const MAX_DISTANCE = Math.hypot(WORLD_WIDTH, WORLD_HEIGHT);
