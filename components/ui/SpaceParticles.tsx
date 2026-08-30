"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  alpha: number;
  /** Multiplies the glow while the pointer is near; eases back to 1. */
  glow: number;
};

// One particle per ~3.5k CSS pixels, so the space around the globe reads as a
// sky rather than a scattering. Capped so a wide monitor does not turn this
// into a per-frame cost.
const AREA_PER_PARTICLE = 3_500;
const MAX_PARTICLES = 520;

const MIN_RADIUS = 0.4;
const MAX_RADIUS = 1.6;
const BASE_ALPHA = 0.5;
const DRIFT_SPEED = 0.16;
const DAMPING = 0.995;
// Brownian nudge, or the field settles into straight lines within a minute.
const JITTER = 0.0015;

const GLOW_RADIUS = 8;
// Pointer reach, and how hard particles lean towards it inside that reach.
const POINTER_RADIUS = 150;
const POINTER_PULL = 0.015;
const GLOW_EASE = 0.12;
const GLOW_RELEASE = 0.06;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Drifting dust for the space around the globe.
 *
 * Sits behind the map canvas, which is transparent outside the sphere once the
 * fog's `space-color` has zero alpha (see components/map/Map.tsx). Purely
 * decorative, so it is hidden from assistive tech and holds still for anyone
 * who asked for reduced motion.
 */
export default function SpaceParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // Canvas cannot read a CSS variable, so the colour arrives as the element's
    // own `color` and is resolved here.
    const color = getComputedStyle(canvas).color;
    const stillOnly = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    const pointer = { x: -Infinity, y: -Infinity };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const wanted = Math.min(
        MAX_PARTICLES,
        Math.round((width * height) / AREA_PER_PARTICLE),
      );
      particles = Array.from({ length: wanted }, () => ({
        x: random(0, width),
        y: random(0, height),
        velocityX: random(-DRIFT_SPEED, DRIFT_SPEED),
        velocityY: random(-DRIFT_SPEED, DRIFT_SPEED),
        radius: random(MIN_RADIUS, MAX_RADIUS),
        alpha: BASE_ALPHA,
        glow: 1,
      }));
    };

    const step = () => {
      for (const particle of particles) {
        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const distance = Math.hypot(dx, dy);

        if (distance < POINTER_RADIUS && distance > 0) {
          const force = (POINTER_RADIUS - distance) / POINTER_RADIUS;
          particle.velocityX += (dx / distance) * force * POINTER_PULL;
          particle.velocityY += (dy / distance) * force * POINTER_PULL;
          particle.alpha = Math.min(1, BASE_ALPHA + force * 0.45);
          particle.glow += (1 + force * 2.5 - particle.glow) * GLOW_EASE;
        } else {
          particle.alpha = Math.max(BASE_ALPHA * 0.35, particle.alpha - 0.015);
          particle.glow = Math.max(
            1,
            particle.glow + (1 - particle.glow) * GLOW_RELEASE,
          );
        }

        particle.velocityX =
          (particle.velocityX + random(-JITTER, JITTER)) * DAMPING;
        particle.velocityY =
          (particle.velocityY + random(-JITTER, JITTER)) * DAMPING;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;

        // Wrap rather than bounce: an edge that reflects reads as a wall.
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      context.shadowColor = color;

      for (const particle of particles) {
        context.globalAlpha = particle.alpha;
        context.shadowBlur = GLOW_RADIUS * particle.glow;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };

    const run = () => {
      step();
      draw();
      frame = requestAnimationFrame(run);
    };

    const start = () => {
      if (frame || stillOnly) return;
      frame = requestAnimationFrame(run);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // A background tab still schedules frames in some browsers; nothing here is
    // worth the wake-ups.
    const onVisibility = () => (document.hidden ? stop() : start());
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -Infinity;
      pointer.y = -Infinity;
    };

    resize();
    draw();
    start();

    const observer = new ResizeObserver(() => {
      resize();
      if (stillOnly) draw();
    });
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-ink-100"
    />
  );
}
