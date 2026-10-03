import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus, RotateCcw, Clock as ClockIcon } from 'lucide-react';

const STORAGE_KEY_SCALE = 'erp_system_time_scale';
const STORAGE_KEY_POS = 'erp_system_time_pos';

const MIN_SCALE = 0.7;
const MAX_SCALE = 1.45;
const DEFAULT_SCALE = 1.0;
const SCALE_STEP = 0.15;

const Clock = () => {
  const [date, setDate] = useState(new Date());

  // Scale state with localStorage persistence
  const [scale, setScale] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCALE);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= MIN_SCALE && parsed <= MAX_SCALE) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read clock scale from localStorage', e);
    }
    return DEFAULT_SCALE;
  });

  // Position state ({ x, y } in pixels, or null for default bottom-right)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read clock pos from localStorage', e);
    }
    return null;
  });

  const widgetRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, initialPosX: 0, initialPosY: 0, hasMoved: false });
  const resizeRef = useRef({ active: false, startX: 0, startY: 0, initialScale: 1.0 });

  // Update live time every second
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Clamp position within window bounds on resize or orientation change
  useEffect(() => {
    const handleWindowResize = () => {
      if (!position || !widgetRef.current) return;
      const rect = widgetRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      const clampedX = Math.max(8, Math.min(position.x, Math.max(8, maxX)));
      const clampedY = Math.max(8, Math.min(position.y, Math.max(8, maxY)));
      if (clampedX !== position.x || clampedY !== position.y) {
        const nextPos = { x: clampedX, y: clampedY };
        setPosition(nextPos);
        try {
          localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(nextPos));
        } catch (e) {}
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [position]);

  // Step-based scale handlers
  const handleZoomIn = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, +(prev + SCALE_STEP).toFixed(2));
      try {
        localStorage.setItem(STORAGE_KEY_SCALE, next.toString());
      } catch (err) {}
      return next;
    });
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setScale((prev) => {
      const next = Math.max(MIN_SCALE, +(prev - SCALE_STEP).toFixed(2));
      try {
        localStorage.setItem(STORAGE_KEY_SCALE, next.toString());
      } catch (err) {}
      return next;
    });
  };

  const handleReset = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setScale(DEFAULT_SCALE);
    setPosition(null);
    try {
      localStorage.removeItem(STORAGE_KEY_SCALE);
      localStorage.removeItem(STORAGE_KEY_POS);
    } catch (err) {}
  };

  // Drag-to-reposition pointer handlers (mouse & touch)
  const handleDragPointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.resize-handle')) {
      return;
    }
    const widget = widgetRef.current;
    if (!widget) return;

    const rect = widget.getBoundingClientRect();
    const currentPosX = position ? position.x : rect.left;
    const currentPosY = position ? position.y : rect.top;

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: currentPosX,
      initialPosY: currentPosY,
      hasMoved: false,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e) => {
    if (!dragRef.current.active || !widgetRef.current) return;
    const widget = widgetRef.current;
    const rect = widget.getBoundingClientRect();

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      dragRef.current.hasMoved = true;
    }

    const rawX = dragRef.current.initialPosX + deltaX;
    const rawY = dragRef.current.initialPosY + deltaY;

    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;

    const clampedX = Math.max(8, Math.min(rawX, Math.max(8, maxX)));
    const clampedY = Math.max(8, Math.min(rawY, Math.max(8, maxY)));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleDragPointerUp = (e) => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (dragRef.current.hasMoved && position) {
        try {
          localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position));
        } catch (err) {}
      }
    }
  };

  // Corner drag-handle resize pointer handlers (mouse & touch)
  const handleResizePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initialScale: scale,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e) => {
    if (!resizeRef.current.active) return;
    const deltaX = e.clientX - resizeRef.current.startX;
    const deltaY = e.clientY - resizeRef.current.startY;
    const avgDelta = (deltaX + deltaY) / 2;

    const deltaScale = avgDelta / 120;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(resizeRef.current.initialScale + deltaScale).toFixed(2)));
    setScale(next);
  };

  const handleResizePointerUp = (e) => {
    if (resizeRef.current.active) {
      resizeRef.current.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      try {
        localStorage.setItem(STORAGE_KEY_SCALE, scale.toString());
      } catch (err) {}
    }
  };

  const formatDate = (d) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-GB', options).toUpperCase();
  };

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Base dimensions at scale 1.0 (compact default)
  const widthPx = Math.round(168 * scale);
  const padV = Math.round(7 * scale);
  const padH = Math.round(10 * scale);
  const borderRadius = Math.round(16 * scale);

  const stylePosition = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
      }
    : {
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
      };

  return (
    <div
      ref={widgetRef}
      onPointerDown={handleDragPointerDown}
      onPointerMove={handleDragPointerMove}
      onPointerUp={handleDragPointerUp}
      onPointerCancel={handleDragPointerUp}
      style={{
        ...stylePosition,
        width: `${widthPx}px`,
        padding: `${padV}px ${padH}px`,
        background: 'var(--clay-surface, #EEF2FB)',
        borderRadius: `${borderRadius}px`,
        boxShadow: '4px 4px 10px rgba(163, 177, 198, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        zIndex: 50,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        cursor: 'grab',
        transition: dragRef.current.active || resizeRef.current.active ? 'none' : 'box-shadow 0.2s ease, width 0.15s ease',
      }}
      className="group"
      title="System Time (Drag to reposition, use +/- or corner handle to resize)"
    >
      {/* Top Bar: Title & Resize/Reset Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: `${Math.round(3 * scale)}px`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${Math.round(4 * scale)}px`,
        }}>
          <ClockIcon size={Math.round(10 * scale)} className="text-indigo-600 flex-shrink-0" />
          <span style={{
            fontSize: `${Math.max(7.5, 8.5 * scale)}px`,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--clay-primary, #6366F1)',
            lineHeight: 1,
          }}>
            System Time
          </span>
        </div>

        {/* Step Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${Math.round(3 * scale)}px`,
        }}>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            title="Shrink widget"
            style={{
              width: `${Math.round(16 * scale)}px`,
              height: `${Math.round(16 * scale)}px`,
              borderRadius: `${Math.round(5 * scale)}px`,
              background: 'rgba(255, 255, 255, 0.8)',
              border: 'none',
              boxShadow: 'inset 1px 1px 2px rgba(163, 177, 198, 0.4), inset -1px -1px 2px rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: scale <= MIN_SCALE ? 'not-allowed' : 'pointer',
              opacity: scale <= MIN_SCALE ? 0.4 : 0.85,
              color: 'var(--clay-text, #2D3748)',
              padding: 0,
            }}
          >
            <Minus size={Math.round(9 * scale)} strokeWidth={3} />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            title="Enlarge widget"
            style={{
              width: `${Math.round(16 * scale)}px`,
              height: `${Math.round(16 * scale)}px`,
              borderRadius: `${Math.round(5 * scale)}px`,
              background: 'rgba(255, 255, 255, 0.8)',
              border: 'none',
              boxShadow: 'inset 1px 1px 2px rgba(163, 177, 198, 0.4), inset -1px -1px 2px rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: scale >= MAX_SCALE ? 'not-allowed' : 'pointer',
              opacity: scale >= MAX_SCALE ? 0.4 : 0.85,
              color: 'var(--clay-text, #2D3748)',
              padding: 0,
            }}
          >
            <Plus size={Math.round(9 * scale)} strokeWidth={3} />
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset to default size and position"
            style={{
              width: `${Math.round(16 * scale)}px`,
              height: `${Math.round(16 * scale)}px`,
              borderRadius: `${Math.round(5 * scale)}px`,
              background: 'rgba(255, 255, 255, 0.8)',
              border: 'none',
              boxShadow: 'inset 1px 1px 2px rgba(163, 177, 198, 0.4), inset -1px -1px 2px rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0.85,
              color: 'var(--clay-muted, #718096)',
              padding: 0,
            }}
          >
            <RotateCcw size={Math.round(8 * scale)} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Time Display */}
      <div style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontSize: `${(0.98 * scale).toFixed(3)}rem`,
        fontWeight: 900,
        letterSpacing: '-0.02em',
        color: 'var(--clay-text, #2D3748)',
        lineHeight: 1.15,
        textAlign: 'right',
      }}>
        {formatTime(date)}
      </div>

      {/* Date & Corner Resize Grip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: `${Math.round(2 * scale)}px`,
      }}>
        <span style={{
          fontSize: `${Math.max(7.5, 9 * scale)}px`,
          fontWeight: 700,
          color: 'var(--clay-muted, #718096)',
          letterSpacing: '0.08em',
          lineHeight: 1,
        }}>
          {formatDate(date)}
        </span>

        {/* Diagonal Corner Resize Handle */}
        <div
          className="resize-handle"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          title="Drag to resize"
          style={{
            cursor: 'nwse-resize',
            padding: `${Math.round(2 * scale)}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            opacity: 0.65,
          }}
        >
          <svg
            width={Math.round(9 * scale)}
            height={Math.round(9 * scale)}
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-slate-400 hover:text-slate-600"
          >
            <line x1="8" y1="2" x2="2" y2="8" />
            <line x1="8" y1="5" x2="5" y2="8" />
            <line x1="8" y1="8" x2="8" y2="8" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Clock;
