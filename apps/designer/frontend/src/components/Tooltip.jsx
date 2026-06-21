import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';

// Usage:
//   <Tooltip text="Run workflow" shortcut="F5">
//     <button>Run</button>
//   </Tooltip>
//
// The wrapper uses `display: contents` so it never affects toolbar layout.
// Because a `display: contents` element has NO layout box of its own,
// getBoundingClientRect() on it returns an empty (0,0,0,0) rect — which is
// why the tooltip used to jump to the top-left corner. We measure the actual
// rendered child element instead, then clamp the tooltip inside the viewport.
export function Tooltip({ text, shortcut, children, placement = 'bottom' }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState(null);   // { top, left, arrowX, placement }
  const triggerRef = useRef(null);
  const tipRef     = useRef(null);
  const rectRef    = useRef(null);
  const timerRef   = useRef(null);

  const measureTrigger = () => {
    const wrap = triggerRef.current;
    if (!wrap) return null;
    // display:contents → measure the real child element, not the wrapper
    const target = wrap.firstElementChild || wrap;
    const rect = target.getBoundingClientRect();
    return (rect.width || rect.height) ? rect : null;
  };

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      rectRef.current = measureTrigger();
      if (rectRef.current) setVisible(true);
    }, 320);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
    setCoords(null);
  }, []);

  // Position once the tooltip is in the DOM so we know its real size,
  // then clamp horizontally + flip vertically to stay inside the viewport.
  useLayoutEffect(() => {
    if (!visible) return;
    const rect = rectRef.current;
    const tip  = tipRef.current;
    if (!rect || !tip) return;

    const margin = 8;
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;

    // Horizontal: centered on the trigger, clamped to the viewport
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(margin, Math.min(left, vw - tipW - margin));

    // Vertical: below by default; flip above if it would overflow
    let place = placement;
    let top = place === 'bottom' ? rect.bottom + 6 : rect.top - tipH - 6;
    if (place === 'bottom' && top + tipH + margin > vh) {
      top = rect.top - tipH - 6; place = 'top';
    } else if (place === 'top' && top < margin) {
      top = rect.bottom + 6; place = 'bottom';
    }
    top = Math.max(margin, Math.min(top, vh - tipH - margin));

    // Keep the arrow pointing at the trigger center even after clamping
    const arrowX = Math.max(10, Math.min(rect.left + rect.width / 2 - left, tipW - 10));
    setCoords({ top, left, arrowX, placement: place });
  }, [visible, placement, text, shortcut]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{ display: 'contents' }}
      >
        {children}
      </span>
      {visible && (
        <div
          ref={tipRef}
          className={`tooltip tooltip--${coords?.placement || placement}`}
          style={{
            top:  coords ? coords.top  : -9999,
            left: coords ? coords.left : -9999,
            visibility: coords ? 'visible' : 'hidden',
            '--tip-arrow-x': coords ? `${coords.arrowX}px` : '50%',
          }}
        >
          <span className="tooltip__text">{text}</span>
          {shortcut && <kbd className="tooltip__kbd">{shortcut}</kbd>}
        </div>
      )}
    </>
  );
}
