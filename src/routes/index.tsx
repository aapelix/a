import rough from "roughjs";
import { Options } from "roughjs/bin/core";
import { RoughSVG } from "roughjs/bin/svg";
import { createEffect, createSignal, onMount } from "solid-js";
import Modes from "~/components/Modes";

type ShapeType =
  | "rectangle"
  | "square"
  | "ellipse"
  | "circle"
  | "text"
  | "line"
  | "arrow";

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

function createArrowPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.hypot(dx, dy);

  const arrowHeadLength = 15;
  const arrowHeadAngle = Math.PI / 6; // 30 deg

  function rot(x: number, y: number) {
    return {
      x: start.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: start.y + x * Math.sin(angle) + y * Math.cos(angle),
    };
  }

  const p1 = rot(0, 0);
  const p2 = rot(length, 0);
  const p3 = rot(
    length - arrowHeadLength * Math.cos(arrowHeadAngle),
    arrowHeadLength * Math.sin(arrowHeadAngle),
  );
  const p4 = rot(
    length - arrowHeadLength * Math.cos(arrowHeadAngle),
    -arrowHeadLength * Math.sin(arrowHeadAngle),
  );

  return `
    M ${p1.x} ${p1.y}
    L ${p2.x} ${p2.y}
    M ${p2.x} ${p2.y}
    L ${p3.x} ${p3.y}
    M ${p2.x} ${p2.y}
    L ${p4.x} ${p4.y}
  `;
}

function createRoughShape(
  rc: RoughSVG,
  shape: ShapeType,
  start: { x: number; y: number },
  end: { x: number; y: number },
): SVGElement {
  const options: Options = {
    strokeWidth: 4,
    roughness: 2,
  };

  let el: SVGElement;

  if (shape === "rectangle") {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    el = rc.path(roundedRectPath(x, y, w, h, 20), options);
  } else if (shape === "square") {
    const xDist = end.x - start.x;
    const yDist = end.y - start.y;
    const size = Math.min(Math.abs(xDist), Math.abs(yDist));
    const x = xDist < 0 ? start.x - size : start.x;
    const y = yDist < 0 ? start.y - size : start.y;
    el = rc.path(roundedRectPath(x, y, size, size, 20), options);
  } else if (shape === "ellipse") {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    el = rc.ellipse(cx, cy, w, h, options);
  } else if (shape === "circle") {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const r = Math.hypot(end.x - start.x, end.y - start.y) / 2;
    el = rc.circle(cx, cy, r * 2, options);
  } else if (shape === "line") {
    el = rc.line(start.x, start.y, end.x, end.y, options);
  } else if (shape === "text") {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(start.x));
    text.setAttribute("y", String(start.y));
    text.setAttribute("font-size", "24");
    text.setAttribute("fill", "black");
    text.textContent = "Text";
    el = text;
  } else if (shape === "arrow") {
    const path = createArrowPath(start, end);
    el = rc.path(path, options);
    el.setAttribute("data-shape-type", getDefaultShapeType(shape));
    return el;
  } else {
    throw new Error("Unsupported shape");
  }

  el.setAttribute("data-shape-type", getDefaultShapeType(shape));
  return el;
}

function getDefaultShapeType(type: ShapeType): ShapeType {
  if (type === "circle") {
    return "ellipse";
  }

  if (type === "square") {
    return "rectangle";
  }

  return type;
}

function getShapeTypeFromElement(el: SVGElement): ShapeType {
  const type = el.getAttribute("data-shape-type");
  if (!type) throw new Error("Missing shape type");
  return type as ShapeType;
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
  const [draggingCorner, setDraggingCorner] = createSignal<
    "tl" | "tr" | "bl" | "br" | null
  >(null);
  const [editIndex, setEditIndex] = createSignal<number | null>(null);

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

  const [orgSize, setOrgSize] = createSignal({ width: 0, height: 0 });

  function doPan(e: PointerEvent) {
    if (editIndex() !== null && dragStartPointer() && dragStartPos()) {
      const dx = e.clientX - dragStartPointer()!.x;
      const dy = e.clientY - dragStartPointer()!.y;

      const index = editIndex()!;
      const shape = shapes()[index];

      const bbox = (shape as SVGGraphicsElement).getBBox();
      const start = { x: dragStartPos()!.x + dx, y: dragStartPos()!.y + dy };

      const newEl = createRoughShape(
        rc,
        getShapeTypeFromElement(shape),
        start,
        { x: start.x + orgSize().width, y: start.y + orgSize().height },
      );

      const newShapes = [...shapes()];
      newShapes[index] = newEl;
      setShapes(newShapes);

      const bboxNew = (newEl as SVGGraphicsElement).getBBox();
      setFakeCoords({
        tl: { cx: bboxNew.x, cy: bboxNew.y },
        tr: { cx: bboxNew.x + bboxNew.width, cy: bboxNew.y },
        bl: { cx: bboxNew.x, cy: bboxNew.y + bboxNew.height },
        br: { cx: bboxNew.x + bboxNew.width, cy: bboxNew.y + bboxNew.height },
      });

      return;
    }

    // resize the selected shape if theres a one
    const corner = draggingCorner();
    if (corner && editIndex() != null) {
      const svgPoint = toSvgCoords(e);
      resizeShape(editIndex()!, corner, svgPoint, e.shiftKey);
      return;
    }

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

  function clearShapes() {
    setShapes([]);
    setMode("normal");
    setEditIndex(null);
    resetEditCoords();
  }

  function endPan(e: PointerEvent) {
    if (dragStartPointer() != null || dragStartPos() != null) {
      setDragStartPointer(null);
      setDragStartPos(null);
      setCoords(fakeCoords());
      setOrgSize({ width: 0, height: 0 });
      return;
    }

    if (draggingCorner()) {
      setDraggingCorner(null);
      setCoords(fakeCoords());
      return;
    }

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
    rc = rough.svg(svgRef, { options: { seed: Date.now() } });
  });

  const [coords, setCoords] = createSignal({
    tl: { cx: -10, cy: -10 },
    tr: { cx: -10, cy: -10 },
    bl: { cx: -10, cy: -10 },
    br: { cx: -10, cy: -10 },
  });

  const [resizing, setResizing] = createSignal(false);
  const [fakeCoords, setFakeCoords] = createSignal(coords());

  const [dragStartPointer, setDragStartPointer] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  const [dragStartPos, setDragStartPos] = createSignal<{
    x: number;
    y: number;
  } | null>(null);

  function resetEditCoords() {
    setCoords({
      tl: { cx: -10, cy: -10 },
      tr: { cx: -10, cy: -10 },
      bl: { cx: -10, cy: -10 },
      br: { cx: -10, cy: -10 },
    });
  }

  function resizeShape(
    index: number,
    corner: "tl" | "tr" | "bl" | "br",
    point: { x: number; y: number },
    symmetric: boolean,
  ) {
    const shape = shapes()[index];

    const opposite = {
      tl: "br",
      tr: "bl",
      bl: "tr",
      br: "tl",
    }[corner] as "tl" | "tr" | "bl" | "br";

    const start = coords()[opposite];
    const end = point;

    let type = getShapeTypeFromElement(shape);

    if (symmetric) type = getSymmetricType(type);

    const newShapes = [...shapes()];
    const newEl = createRoughShape(rc, type, { x: start.cx, y: start.cy }, end);
    newShapes[index] = newEl;
    setShapes(newShapes);
    setEditIndex(index);

    const bbox = (newEl as SVGGraphicsElement).getBBox();
    setFakeCoords({
      tl: { cx: bbox.x, cy: bbox.y },
      tr: { cx: bbox.x + bbox.width, cy: bbox.y },
      bl: { cx: bbox.x, cy: bbox.y + bbox.height },
      br: { cx: bbox.x + bbox.width, cy: bbox.y + bbox.height },
    });
  }

  createEffect(() => {
    setResizing(
      draggingCorner() != null ||
        dragStartPointer() != null ||
        dragStartPos() != null,
    );

    console.log(resizing());
  });

  return (
    <main>
      <div class="fixed z-50 left-0 top-0">
        <div class="flex w-screen justify-center items-center scale-75">
          <Modes setMode={setMode} clearShapes={clearShapes} />
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
          {shapes().map((shape, i) => (
            <g
              class={`hover:cursor-pointer`}
              ref={(el) => el.appendChild(shape)}
              onClick={() => {
                setEditIndex(i);

                const index = editIndex();
                if (index == null) return;

                const { x, y, width, height } = (
                  shape as SVGGraphicsElement
                ).getBBox();
                console.log(x, y, width, height);
                setCoords({
                  tl: { cx: x, cy: y },
                  tr: { cx: x + width, cy: y },
                  bl: { cx: x, cy: y + height },
                  br: { cx: x + width, cy: y + height },
                });
              }}
              onPointerDown={(e) => {
                setDragStartPointer({ x: e.clientX, y: e.clientY });
                const bbox = (shape as SVGGraphicsElement).getBBox();
                setDragStartPos({ x: bbox.x, y: bbox.y });
                setOrgSize(bbox);
              }}
            />
          ))}

          <circle
            cx={resizing() ? fakeCoords().tl.cx : coords().tl.cx}
            cy={resizing() ? fakeCoords().tl.cy : coords().tl.cy}
            r={5}
            fill="#ff9fa0"
            class="z-50 cursor-nwse-resize"
            onPointerDown={() => {
              setDraggingCorner("tl");
            }}
          />
          <circle
            cx={resizing() ? fakeCoords().tr.cx : coords().tr.cx}
            cy={resizing() ? fakeCoords().tr.cy : coords().tr.cy}
            r={5}
            fill="#ff9fa0"
            class="z-50 cursor-nesw-resize"
            onPointerDown={() => {
              setDraggingCorner("tr");
            }}
          />

          <circle
            cx={resizing() ? fakeCoords().bl.cx : coords().bl.cx}
            cy={resizing() ? fakeCoords().bl.cy : coords().bl.cy}
            r={5}
            fill="#ff9fa0"
            class="z-50 cursor-sw-resize"
            onPointerDown={() => {
              setDraggingCorner("bl");
            }}
          />
          <circle
            cx={resizing() ? fakeCoords().br.cx : coords().br.cx}
            cy={resizing() ? fakeCoords().br.cy : coords().br.cy}
            r={5}
            fill="#ff9fa0"
            class="z-50 cursor-nw-resize"
            onPointerDown={() => {
              setDraggingCorner("br");
            }}
          />
          <line
            x1={resizing() ? fakeCoords().tl.cx : coords().tl.cx}
            y1={resizing() ? fakeCoords().tl.cy : coords().tl.cy}
            x2={resizing() ? fakeCoords().tr.cx : coords().tr.cx}
            y2={resizing() ? fakeCoords().tr.cy : coords().tr.cy}
            stroke="#ff9fa0"
            stroke-width={2}
          />
          <line
            x1={resizing() ? fakeCoords().tr.cx : coords().tr.cx}
            y1={resizing() ? fakeCoords().tr.cy : coords().tr.cy}
            x2={resizing() ? fakeCoords().br.cx : coords().br.cx}
            y2={resizing() ? fakeCoords().br.cy : coords().br.cy}
            stroke="#ff9fa0"
            stroke-width={2}
          />
          <line
            x1={resizing() ? fakeCoords().br.cx : coords().br.cx}
            y1={resizing() ? fakeCoords().br.cy : coords().br.cy}
            x2={resizing() ? fakeCoords().bl.cx : coords().bl.cx}
            y2={resizing() ? fakeCoords().bl.cy : coords().bl.cy}
            stroke="#ff9fa0"
            stroke-width={2}
          />
          <line
            x1={resizing() ? fakeCoords().bl.cx : coords().bl.cx}
            y1={resizing() ? fakeCoords().bl.cy : coords().bl.cy}
            x2={resizing() ? fakeCoords().tl.cx : coords().tl.cx}
            y2={resizing() ? fakeCoords().tl.cy : coords().tl.cy}
            stroke="#ff9fa0"
            stroke-width={2}
          />
        </svg>
      </div>
    </main>
  );
}
