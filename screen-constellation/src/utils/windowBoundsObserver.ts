export interface WindowBoundsObserverState {
  viewportX: number;
  viewportY: number;
  canvasOffsetX: number;
  canvasOffsetY: number;
}

export type WindowBoundsObserverListener = (
  state: WindowBoundsObserverState
) => void;

export interface WindowBoundsObserver {
  stop(): void;
  getState(): WindowBoundsObserverState;
}

export function createWindowBoundsObserver(
  onUpdate: WindowBoundsObserverListener
): WindowBoundsObserver {
  let tracking = false;
  let frameId = 0;
  let lastTime = 0;
  let lastState = computeState();

  function computeState(): WindowBoundsObserverState {
    const sx = window.screenX ?? (window as any).screenLeft ?? 0;
    const sy = window.screenY ?? (window as any).screenTop ?? 0;
    const outerW = window.outerWidth || window.innerWidth;
    const outerH = window.outerHeight || window.innerHeight;
    const innerW = window.innerWidth;
    const innerH = window.innerHeight;
    const viewportX = sx + (outerW - innerW) / 2;
    const viewportY = sy + (outerH - innerH);
    return {
      viewportX,
      viewportY,
      canvasOffsetX: -viewportX,
      canvasOffsetY: -viewportY,
    };
  }

  function hasChanged(
    a: WindowBoundsObserverState,
    b: WindowBoundsObserverState
  ): boolean {
    return (
      a.viewportX !== b.viewportX ||
      a.viewportY !== b.viewportY ||
      a.canvasOffsetX !== b.canvasOffsetX ||
      a.canvasOffsetY !== b.canvasOffsetY
    );
  }

  function shouldTrack(): boolean {
    return document.visibilityState === "visible" && document.hasFocus();
  }

  function tick(t: number) {
    if (!tracking) return;
    if (!shouldTrack()) {
      tracking = false;
      return;
    }

    if (t - lastTime >= 50) {
      const next = computeState();
      if (hasChanged(lastState, next)) {
        lastState = next;
        onUpdate(next);
      }
      lastTime = t;
    }

    frameId = requestAnimationFrame(tick);
  }

  function start() {
    if (tracking || !shouldTrack()) return;
    tracking = true;
    frameId = requestAnimationFrame(tick);
  }

  function stopInternal() {
    tracking = false;
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function handleResize() {
    const next = computeState();
    if (hasChanged(lastState, next)) {
      lastState = next;
      onUpdate(next);
    }
    start();
  }

  function handleVisibilityOrFocus() {
    if (shouldTrack()) {
      const next = computeState();
      if (hasChanged(lastState, next)) {
        lastState = next;
        onUpdate(next);
      }
      start();
    } else {
      stopInternal();
    }
  }

  window.addEventListener("resize", handleResize);
  window.addEventListener("focus", handleVisibilityOrFocus);
  window.addEventListener("blur", handleVisibilityOrFocus);
  document.addEventListener("visibilitychange", handleVisibilityOrFocus);

  onUpdate(lastState);
  if (shouldTrack()) start();

  return {
    stop() {
      stopInternal();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("blur", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    },
    getState() {
      return lastState;
    },
  };
}
