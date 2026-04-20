import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

const MAX_HISTORY = 60;
const CW = 1600, CH = 900;

const Canvas = forwardRef(function Canvas({ tool, color, brushSize, send, remoteCursors }, ref) {
  const canvasRef  = useRef(null);
  const overlayRef = useRef(null);
  const isDrawing  = useRef(false);
  const startPos   = useRef({ x: 0, y: 0 });
  const history    = useRef([]);
  const redoStack  = useRef([]);

  useImperativeHandle(ref, () => ({
    undo() {
      if (history.current.length <= 1) return false;
      const ctx = canvasRef.current.getContext("2d");
      redoStack.current.push(history.current.pop());
      ctx.putImageData(history.current[history.current.length - 1], 0, 0);
      return true;
    },
    redo() {
      if (!redoStack.current.length) return false;
      const snap = redoStack.current.pop();
      history.current.push(snap);
      canvasRef.current.getContext("2d").putImageData(snap, 0, 0);
      return true;
    },
    clear() {
      canvasRef.current.getContext("2d").clearRect(0, 0, CW, CH);
      snap(); redoStack.current = [];
    },
    canUndo: () => history.current.length > 1,
    canRedo: () => redoStack.current.length > 0,
    drawRemoteStroke(data) { paint(data); snap(); },
    loadStrokes(strokes) {
      canvasRef.current.getContext("2d").clearRect(0, 0, CW, CH);
      strokes.forEach(paint); snap();
    },
    toDataURL: () => canvasRef.current?.toDataURL(),
  }));

  function snap() {
    const s = canvasRef.current.getContext("2d").getImageData(0, 0, CW, CH);
    history.current.push(s);
    if (history.current.length > MAX_HISTORY) history.current.shift();
  }
  useEffect(() => { snap(); }, []);

  function paint(d) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = d.tool === "eraser" ? "#ffffff" : (d.color || "#6366f1");
    ctx.lineWidth   = d.width || 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (d.tool === "rectangle") {
      ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
    } else if (d.tool === "circle") {
      const rx = (d.x1 - d.x0) / 2, ry = (d.y1 - d.y0) / 2;
      ctx.beginPath();
      ctx.ellipse(d.x0 + rx, d.y0 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      if (d.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
    }
    ctx.restore();
  }

  function showPreview(x0, y0, x1, y1) {
    const ov = overlayRef.current; if (!ov) return;
    const ctx = ov.getContext("2d");
    ctx.clearRect(0, 0, ov.width, ov.height);
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = brushSize;
    ctx.lineCap = "round"; ctx.setLineDash([8, 4]); ctx.globalAlpha = 0.6;
    if (tool === "rectangle") {
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    } else if (tool === "circle") {
      const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
      ctx.beginPath();
      ctx.ellipse(x0 + rx, y0 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function clearOverlay() {
    const ov = overlayRef.current;
    if (ov) ov.getContext("2d").clearRect(0, 0, ov.width, ov.height);
  }

  function getPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: (s.clientX - r.left) * (CW / r.width), y: (s.clientY - r.top) * (CH / r.height) };
  }

  function onDown(e) {
    isDrawing.current = true; startPos.current = getPos(e);
    if (tool === "pen" || tool === "eraser" || tool === "pen2") snap();
    redoStack.current = [];
  }

  function onMove(e) {
    const p = getPos(e);
    send({ type: "cursor", x: p.x, y: p.y });
    if (!isDrawing.current) return;
    const isPen = tool === "pen" || tool === "eraser" || tool === "pen2";
    if (isPen) {
      const d = { tool, color, width: brushSize, x0: startPos.current.x, y0: startPos.current.y, x1: p.x, y1: p.y };
      paint(d); send({ type: "stroke", data: d }); startPos.current = p;
    } else {
      showPreview(startPos.current.x, startPos.current.y, p.x, p.y);
    }
  }

  function onUp(e) {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (tool === "rectangle" || tool === "circle") {
      const p = getPos(e);
      const d = { tool, color, width: brushSize, x0: startPos.current.x, y0: startPos.current.y, x1: p.x, y1: p.y };
      clearOverlay(); snap(); paint(d); send({ type: "stroke", data: d });
    }
  }

  return (
    /* White canvas card — rounded, deep shadow, centered */
    <div className="relative bg-white rounded-2xl overflow-hidden"
      style={{
        width: "100%", maxWidth: "900px",
        aspectRatio: "16/9",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
      }}>

      <canvas ref={canvasRef} width={CW} height={CH}
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair", display: "block", width: "100%", height: "100%" }}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
        onMouseLeave={() => { isDrawing.current = false; clearOverlay(); }}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      />

      <canvas ref={overlayRef} width={CW} height={CH}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%" }}
      />

      {/* Remote cursors */}
      {Object.values(remoteCursors).map((c) => (
        <div key={c.userId} className="pointer-events-none absolute z-20"
          style={{ left: `${(c.x / CW) * 100}%`, top: `${(c.y / CH) * 100}%`, transform: "translate(-2px,-2px)" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 3l13 5.5-6.5 2L7 17 3 3z" fill={c.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <span style={{
            position: "absolute", top: 20, left: 6,
            background: c.color, color: "#fff", fontSize: 10, fontWeight: 700,
            padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)", fontFamily: "Inter,sans-serif",
          }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
});

export default Canvas;
