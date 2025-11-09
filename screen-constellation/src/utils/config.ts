export const BROADCAST_INTERVAL = 400;

export const COLORS = {
  BACKGROUND: "#fafafa",
  GRID: "#959596",
  NODE_SELF: "#8c8c8c",
  NODE_OTHER: "#aba9a9",
  EDGE: "#43464a",
} as const;

export const EDGE = {
  ALPHA_MIN: 0.12,
  ALPHA_MAX: 0.4,
  WIDTH_MIN: 1.2,
  WIDTH_MAX: 2.5,
} as const;

export const GRID = {
  ALPHA: 0.35,
  LINE_WIDTH: 0.5,
  STEP: 60,
} as const;

export const NODE = {
  ALPHA_OTHER: 0.85,
  ALPHA_SELF: 0.95,
  RADIUS_MIN: 8,
  RADIUS_OTHER: 3.2,
  RADIUS_RANGE: 24,
  RADIUS_SELF: 4.2,
  RADIUS_VARIATION: 0.4,
  // animation speeds are in radians per millisecond (for oscillation cycles)
  SPEED_MIN: 0.00035,
  SPEED_RANGE: 0.00045,
} as const;

export const MAX_EDGES_PER_NODE = 3;
export const MIN_MAX_DISTANCE = 100;
export const VIEWPORT_CULLING_PADDING = 50;
