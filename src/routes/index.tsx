import rough from "roughjs";
import { Options } from "roughjs/bin/core";
import { RoughSVG } from "roughjs/bin/svg";
import { createSignal, onMount } from "solid-js";
import Modes from "~/components/Modes";

type ShapeType =
  | "rectangle"
  | "square"
  | "ellipse"
  | "circle"
  | "text"
  | "line";

function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  return `
    M${x + radius},${y}
    H${x + width - radius}
    A${radius},${radius} 0 0 1 ${x + width},${y + radius}
    V${y + height - radius}
    A${radius},${radius} 0 0 1 ${x + width - radius},${y + height}
    H${x + radius}
    A${radius},${radius} 0 0 1 ${x},${y + height - radius}
    V${y + radius}
    A${radius},${radius} 0 0 1 ${x + radius},${y}
    Z
  `;
}

function createRoughShape(
  rc: RoughSVG,
  shape: ShapeType,
  start: { x: number; y: number },
  end: { x: number; y: number },
): SVGElement {
  const options: Options = {
    strokeWidth: 2,
    bowing: 1.5,
    roughness: 1,
  };

  if (shape === "rectangle") {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    return rc.path(roundedRectPath(x, y, w, h, 20), options);

    //return rc.rectangle(x, y, w, h, options);
  }
  if (shape === "square") {
    const xDist = end.x - start.x;
    const yDist = end.y - start.y;
    const size = Math.min(Math.abs(xDist), Math.abs(yDist));
    const x = xDist < 0 ? start.x - size : start.x;
    const y = yDist < 0 ? start.y - size : start.y;

    return rc.path(roundedRectPath(x, y, size, size, 20), options);
    //return rc.rectangle(x, y, size, size, options);
  }
  if (shape === "ellipse") {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    return rc.ellipse(cx, cy, w, h, options);
  }
  if (shape === "circle") {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const r = Math.hypot(end.x - start.x, end.y - start.y) / 2;
    return rc.circle(cx, cy, r * 2, options);
  }
  if (shape === "text") {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(start.x));
    text.setAttribute("y", String(start.y));
    text.setAttribute("font-size", "24");
    text.setAttribute("fill", "black");
    text.textContent = "Text";
    return text;
  }
  if (shape === "line") {
    return rc.line(start.x, start.y, end.x, end.y);
  }
  throw new Error("Unsupported shape");
}

function getSymmetricType(type: ShapeType): ShapeType {
  switch (type) {
    case "ellipse":
      return "circle";
    case "rectangle":
      return "square";
  }

  return type;
}

export default function Home() {
  let svgRef!: SVGSVGElement;
  let rc!: RoughSVG;
  let previewEl: SVGElement | null;

  const [shapes, setShapes] = createSignal<SVGElement[]>([]);
  const [mode, setMode] = createSignal<"normal" | "move" | `add-${ShapeType}`>(
    "normal",
  );
  const [drawStart, setDrawStart] = createSignal<{
    x: number;
    y: number;
  } | null>(null);

  const [zoom, setZoom] = createSignal(1);

  const [canvasSize, setCanvasSize] = createSignal<[number, number]>([
    10000, 10000,
  ]);

  const [isPanning, setIsPanning] = createSignal(false);
  const [startPoint, setStartPoint] = createSignal({ x: 0, y: 0 });
  const [offsetX, setOffsetX] = createSignal(0);
  const [offsetY, setOffsetY] = createSignal(0);
  const [background, setBackground] = createSignal("#e4d8b4");

  function addShape(shape: SVGElement) {
    setShapes([...shapes(), shape]);
  }

  function toSvgCoords(e: PointerEvent) {
    const scale = zoom();
    return {
      x: (e.clientX - offsetX()) / scale,
      y: (e.clientY - offsetY()) / scale,
    };
  }

  function getShapeType() {
    return mode().replace("add-", "") as ShapeType;
  }

  function isAddShapeMode() {
    return mode().startsWith("add-");
  }

  function startPan(e: PointerEvent) {
    if (mode() === "add-text") {
      const svgPoint = toSvgCoords(e);
      const textEl = createRoughShape(rc, "text", svgPoint, svgPoint);
      addShape(textEl);
      setMode("normal");
      return;
    }

    if (isAddShapeMode()) {
      const svgPoint = toSvgCoords(e);
      setDrawStart(svgPoint);
      return;
    }

    if (e.button !== 1 && mode() !== "move") return;

    setIsPanning(true);
    setStartPoint({ x: e.clientX - offsetX(), y: e.clientY - offsetY() });
  }

  function getCursorType() {
    if (isPanning() || mode() === "move") return "pointer";

    return mode() !== "normal" ? "crosshair" : "default";
  }

  function doPan(e: PointerEvent) {
    if (isAddShapeMode() && drawStart()) {
      // draw preview
      const svgPoint = toSvgCoords(e);
      let type = getShapeType();
      if (e.shiftKey) {
        type = getSymmetricType(type);
      }

      if (previewEl) svgRef.removeChild(previewEl);
      previewEl = createRoughShape(rc, type, drawStart()!, svgPoint);
      svgRef.appendChild(previewEl);

      return;
    }

    if (!isPanning()) return;
    setOffsetX(e.clientX - startPoint().x);
    setOffsetY(e.clientY - startPoint().y);
  }

  function endPan(e: PointerEvent) {
    if (isAddShapeMode() && drawStart()) {
      const svgPoint = toSvgCoords(e);
      let type = getShapeType();
      if (e.shiftKey) {
        type = getSymmetricType(type);
      }

      if (previewEl) {
        svgRef.removeChild(previewEl);
        previewEl = null;
      }

      const shape = createRoughShape(rc, type, drawStart()!, svgPoint);
      addShape(shape);

      setDrawStart(null);
      setMode("normal");
      return;
    }

    setIsPanning(false);
  }

  onMount(() => {
    rc = rough.svg(svgRef);
  });

  return (
    <main>
      <div class="fixed z-50 left-0 top-0">
        <div class="flex w-screen justify-center items-center scale-75">
          <Modes setMode={setMode} />
        </div>
      </div>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
          background: background(),
          cursor: getCursorType(),
        }}
        onPointerDown={startPan}
        onPointerMove={doPan}
        onPointerUp={endPan}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.1 : 0.9;
          setZoom(zoom() * factor);
        }}
      >
        <svg
          ref={svgRef}
          width={canvasSize()[0]}
          height={canvasSize()[1]}
          style={{
            transform: `translate(${offsetX()}px, ${offsetY()}px) scale(${zoom()})`,
            "transform-origin": "0 0",
          }}
        >
          {shapes().map((shape) => (
            <g class="hover:cursor-pointer" innerHTML={shape.outerHTML} />
          ))}
        </svg>
      </div>
    </main>
  );
}
