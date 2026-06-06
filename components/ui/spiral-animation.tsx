"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

class Vector2D {
  constructor(public x: number, public y: number) {}
  static random(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}

class Vector3D {
  constructor(public x: number, public y: number, public z: number) {}
}

class AnimationController {
  private timeline: gsap.core.Timeline;
  private time = 0;
  private ctx: CanvasRenderingContext2D;
  private size: number;
  private stars: Star[] = [];

  private readonly changeEventTime = 0.32;
  private readonly cameraZ = -400;
  private readonly cameraTravelDistance = 3400;
  private readonly startDotYOffset = 28;
  private readonly viewZoom = 100;
  private readonly numberOfStars = 5000;
  private readonly trailLength = 80;

  constructor(_canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, _dpr: number, size: number) {
    this.ctx = ctx;
    this.size = size;
    this.timeline = gsap.timeline({ repeat: -1 });
    this.createStars();
    this.setupTimeline();
  }

  private createStars() {
    this.stars = [];
    for (let i = 0; i < this.numberOfStars; i++) {
      this.stars.push(new Star(this.cameraZ, this.cameraTravelDistance));
    }
  }

  private setupTimeline() {
    this.timeline.to(this, {
      time: 1,
      duration: 15,
      repeat: -1,
      ease: "none",
      onUpdate: () => this.render(),
    });
  }

  public ease(p: number, g: number): number {
    if (p < 0.5) return 0.5 * Math.pow(2 * p, g);
    return 1 - 0.5 * Math.pow(2 * (1 - p), g);
  }

  public easeOutElastic(x: number): number {
    const c4 = (2 * Math.PI) / 4.5;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return Math.pow(2, -8 * x) * Math.sin((x * 8 - 0.75) * c4) + 1;
  }

  public map(value: number, start1: number, stop1: number, start2: number, stop2: number): number {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }

  public constrain(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  public lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
  }

  public spiralPath(p: number): Vector2D {
    p = this.constrain(1.2 * p, 0, 1);
    p = this.ease(p, 1.8);
    const numberOfSpiralTurns = 6;
    const theta = 2 * Math.PI * numberOfSpiralTurns * Math.sqrt(p);
    const r = 170 * Math.sqrt(p);
    return new Vector2D(r * Math.cos(theta), r * Math.sin(theta) + this.startDotYOffset);
  }

  public rotate(v1: Vector2D, v2: Vector2D, p: number, orientation: boolean): Vector2D {
    const middle = new Vector2D((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
    const dx = v1.x - middle.x;
    const dy = v1.y - middle.y;
    const angle = Math.atan2(dy, dx);
    const o = orientation ? -1 : 1;
    const r = Math.sqrt(dx * dx + dy * dy);
    const bounce = Math.sin(p * Math.PI) * 0.05 * (1 - p);
    return new Vector2D(
      middle.x + r * (1 + bounce) * Math.cos(angle + o * Math.PI * this.easeOutElastic(p)),
      middle.y + r * (1 + bounce) * Math.sin(angle + o * Math.PI * this.easeOutElastic(p))
    );
  }

  public showProjectedDot(position: Vector3D, sizeFactor: number) {
    const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1);
    const newCameraZ = this.cameraZ + this.ease(Math.pow(t2, 1.2), 1.8) * this.cameraTravelDistance;
    if (position.z > newCameraZ) {
      const dotDepthFromCamera = position.z - newCameraZ;
      const x = (this.viewZoom * position.x) / dotDepthFromCamera;
      const y = (this.viewZoom * position.y) / dotDepthFromCamera;
      // uniform small, crisp dots — cap the radius so near particles don't balloon
      const sw = (400 * sizeFactor) / dotDepthFromCamera;
      const radius = Math.min(Math.max(sw * 0.5, 0.7), 1.0);
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawStartDot() {
    if (this.time > this.changeEventTime) {
      const dy = (this.cameraZ * this.startDotYOffset) / this.viewZoom;
      const position = new Vector3D(0, dy, this.cameraTravelDistance);
      this.showProjectedDot(position, 2.5);
    }
  }

  public render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.save();
    ctx.translate(this.size / 2, this.size / 2);
    const t1 = this.constrain(this.map(this.time, 0, this.changeEventTime + 0.25, 0, 1), 0, 1);
    const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1);
    ctx.rotate(-Math.PI * this.ease(t2, 2.7));
    this.drawTrail(t1);
    ctx.fillStyle = "white";
    for (const star of this.stars) star.render(t1, this);
    this.drawStartDot();
    ctx.restore();
  }

  private drawTrail(t1: number) {
    for (let i = 0; i < this.trailLength; i++) {
      const f = this.map(i, 0, this.trailLength, 1.1, 0.1);
      const sw = (1.3 * (1 - t1) + 3.0 * Math.sin(Math.PI * t1)) * f;
      this.ctx.fillStyle = "white";
      this.ctx.lineWidth = sw;
      const pathTime = t1 - 0.00015 * i;
      const position = this.spiralPath(pathTime);
      const offset = new Vector2D(position.x + 5, position.y + 5);
      const rotated = this.rotate(position, offset, Math.sin(this.time * Math.PI * 2) * 0.5 + 0.5, i % 2 === 0);
      this.ctx.beginPath();
      this.ctx.arc(rotated.x, rotated.y, sw / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  public destroy() {
    this.timeline.kill();
  }
}

class Star {
  private dx: number;
  private dy: number;
  private spiralLocation: number;
  private strokeWeightFactor: number;
  private z: number;
  private angle: number;
  private distance: number;
  private rotationDirection: number;
  private expansionRate: number;
  private finalScale: number;
  public cameraZ: number;
  public viewZoom = 100;

  constructor(cameraZ: number, cameraTravelDistance: number) {
    this.cameraZ = cameraZ;
    this.angle = Math.random() * Math.PI * 2;
    this.distance = 30 * Math.random() + 15;
    this.rotationDirection = Math.random() > 0.5 ? 1 : -1;
    this.expansionRate = 1.2 + Math.random() * 0.8;
    this.finalScale = 0.7 + Math.random() * 0.6;
    this.dx = this.distance * Math.cos(this.angle);
    this.dy = this.distance * Math.sin(this.angle);
    this.spiralLocation = (1 - Math.pow(1 - Math.random(), 3.0)) / 1.3;
    this.z = Vector2D.random(0.5 * cameraZ, cameraTravelDistance + cameraZ);
    const lerp = (s: number, e: number, t: number) => s * (1 - t) + e * t;
    this.z = lerp(this.z, cameraTravelDistance / 2, 0.3 * this.spiralLocation);
    this.strokeWeightFactor = Math.pow(Math.random(), 2.0);
  }

  render(p: number, c: AnimationController) {
    const spiralPos = c.spiralPath(this.spiralLocation);
    const q = p - this.spiralLocation;
    if (q <= 0) return;
    const dp = c.constrain(4 * q, 0, 1);
    const powerEasing = Math.pow(dp, 2);
    const elasticEasing = c.easeOutElastic(dp);
    let easing: number;
    if (dp < 0.3) easing = c.lerp(dp, powerEasing, dp / 0.3);
    else if (dp < 0.7) easing = c.lerp(powerEasing, elasticEasing, (dp - 0.3) / 0.4);
    else easing = elasticEasing;

    let screenX: number, screenY: number;
    if (dp < 0.3) {
      screenX = c.lerp(spiralPos.x, spiralPos.x + this.dx * 0.3, easing / 0.3);
      screenY = c.lerp(spiralPos.y, spiralPos.y + this.dy * 0.3, easing / 0.3);
    } else if (dp < 0.7) {
      const mid = (dp - 0.3) / 0.4;
      const curve = Math.sin(mid * Math.PI) * this.rotationDirection * 1.5;
      const baseX = spiralPos.x + this.dx * 0.3;
      const baseY = spiralPos.y + this.dy * 0.3;
      const targetX = spiralPos.x + this.dx * 0.7;
      const targetY = spiralPos.y + this.dy * 0.7;
      const perpX = -this.dy * 0.4 * curve;
      const perpY = this.dx * 0.4 * curve;
      screenX = c.lerp(baseX, targetX, mid) + perpX * mid;
      screenY = c.lerp(baseY, targetY, mid) + perpY * mid;
    } else {
      const fin = (dp - 0.7) / 0.3;
      const baseX = spiralPos.x + this.dx * 0.7;
      const baseY = spiralPos.y + this.dy * 0.7;
      const targetDistance = this.distance * this.expansionRate * 1.5;
      const spiralAngle = this.angle + 1.2 * this.rotationDirection * fin * Math.PI;
      const targetX = spiralPos.x + targetDistance * Math.cos(spiralAngle);
      const targetY = spiralPos.y + targetDistance * Math.sin(spiralAngle);
      screenX = c.lerp(baseX, targetX, fin);
      screenY = c.lerp(baseY, targetY, fin);
    }

    const vx = ((this.z - this.cameraZ) * screenX) / this.viewZoom;
    const vy = ((this.z - this.cameraZ) * screenY) / this.viewZoom;
    const position = new Vector3D(vx, vy, this.z);

    let sizeMultiplier = 1.0;
    if (dp < 0.6) sizeMultiplier = 1.0 + dp * 0.2;
    else sizeMultiplier = 1.2 * (1.0 - (dp - 0.6) / 0.4) + this.finalScale * ((dp - 0.6) / 0.4);

    const dotSize = 8.5 * this.strokeWeightFactor * sizeMultiplier;
    c.showProjectedDot(position, dotSize);
  }
}

export function SpiralAnimation() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<AnimationController | null>(null);
  // measured from the CONTAINER (not the window) so the spiral fits any panel
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measure = () =>
      setDimensions({ width: wrapper.clientWidth, height: wrapper.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // square canvas centred in the container so the spiral always fits
    const size = Math.max(dimensions.width, dimensions.height);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    animationRef.current = new AnimationController(canvas, ctx, dpr, size);
    return () => {
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [dimensions]);

  return (
    <div ref={wrapperRef} className="relative w-full h-full overflow-hidden">
      {/* square canvas centred so the spiral core sits in the middle of the panel */}
      <canvas
        ref={canvasRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
