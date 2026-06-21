import React from 'react';

// Consistent 16×16 stroke-based SVG icons.
// All use stroke="currentColor" so they inherit color from CSS.

export function IconGlobe({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2C6.7 4 6 6 6 8s.7 4 2 6" />
      <path d="M8 2c1.3 2 2 4 2 6s-.7 4-2 6" />
      <path d="M2.5 6h11M2.5 10h11" />
    </svg>
  );
}

export function IconLink({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4" />
      <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12" />
    </svg>
  );
}

export function IconType({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4.5h11M8 4.5v8" />
      <path d="M5 12.5h6" />
    </svg>
  );
}

export function IconMousePointer({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.5 1.5v9.5l2.5-2.2 1.9 4.2 1.4-.6-1.9-4.2h3.2L3.5 1.5Z" />
    </svg>
  );
}

export function IconPlay({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2.5L13 8 4 13.5V2.5Z" />
    </svg>
  );
}

export function IconPlayCircle({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M6.5 5.5L11 8 6.5 10.5V5.5Z" strokeWidth="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconStopSquare({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <rect x="5" y="5" width="6" height="6" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconFolderOpen({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11.5V4.5a1 1 0 0 1 1-1h3.5l1.5 1.5H13a1 1 0 0 1 1 1v.5" />
      <path d="M1.5 7.5h13l-1.5 6H3L1.5 7.5Z" />
    </svg>
  );
}

export function IconSave({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 13.5H2.5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1H11l2.5 2.5V12.5a1 1 0 0 1-1 1Z" />
      <rect x="4.5" y="2.5" width="5" height="3.5" rx=".5" />
      <rect x="4" y="8.5" width="8" height="4" rx=".5" />
    </svg>
  );
}

export function IconDocument({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2H3.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L10 2Z" />
      <path d="M10 2v3.5H13.5" />
      <path d="M5.5 8.5h5M5.5 11h3" />
    </svg>
  );
}

export function IconSettings({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v1.5M8 13.5V15M3.2 3.2l1 1M11.8 11.8l1 1M1 8h1.5M13.5 8H15M3.2 12.8l1-1M11.8 4.2l1-1" />
    </svg>
  );
}

export function IconCrosshair({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="4" />
      <path d="M8 1v3M8 12v3M1 8h3M12 8h3" />
    </svg>
  );
}

export function IconChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

export function IconChevronRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

export function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.8" cy="6.8" r="4.3" />
      <path d="M10.2 10.2L14 14" />
    </svg>
  );
}

export function IconTerminal({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M4 6l3 3-3 3" />
      <path d="M9 12h3" />
    </svg>
  );
}

export function IconTrash({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4h11M5.5 4V2.5h5V4M4.5 4l.8 9.5h6.4l.8-9.5" />
    </svg>
  );
}

export function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l3.5 3.5L13 5" />
    </svg>
  );
}

export function IconX({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

export function IconXSmall({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

export function IconProperties({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 6h6M5 8.5h6M5 11h3.5" />
    </svg>
  );
}

export function IconSpinner({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" strokeLinecap="round" className="icon-spin">
      <circle cx="8" cy="8" r="5.5" stroke="#E5E7EB" strokeWidth="2" />
      <path d="M8 2.5A5.5 5.5 0 0 1 13.5 8" stroke="#2563EB" strokeWidth="2" />
    </svg>
  );
}

export function IconInfo({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v5M8 5.5V5" />
    </svg>
  );
}

export function IconWarning({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" />
      <path d="M8 6v4M8 11.5v.5" />
    </svg>
  );
}

// Manufactura Connect logo — industrial hexagon enclosing a connected
// automation-node network. Matches assets/icon.svg.
export function LogoMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4.5" fill="#2563EB" />
      <path
        d="M16 10 L13 15.2 L7 15.2 L4 10 L7 4.8 L13 4.8 Z"
        fill="none" stroke="#FFFFFF" strokeWidth="1.2"
        strokeLinejoin="round" strokeLinecap="round"
      />
      <g stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round">
        <line x1="10" y1="7.4" x2="7.7" y2="11.8" />
        <line x1="10" y1="7.4" x2="12.3" y2="11.8" />
        <line x1="7.7" y1="11.8" x2="12.3" y2="11.8" />
      </g>
      <g fill="#FFFFFF">
        <circle cx="10" cy="7.4" r="1.3" />
        <circle cx="7.7" cy="11.8" r="1.3" />
        <circle cx="12.3" cy="11.8" r="1.3" />
      </g>
    </svg>
  );
}

export function IconMinimize({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 6h8" />
    </svg>
  );
}

export function IconMaximize({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="8" height="8" />
    </svg>
  );
}

export function IconClose({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 2l8 8M10 2L2 10" />
    </svg>
  );
}

export function IconPanelBottom({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M2 10h12" />
    </svg>
  );
}

export function IconChevronUp({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l5-5 5 5" />
    </svg>
  );
}

// ── Stage 6 — Excel icons ─────────────────────────────────────

// Spreadsheet grid with open-folder tab — Open Excel
export function IconExcelOpen({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="13" height="11" rx="1.5" />
      <path d="M1.5 6.5h13" />
      <path d="M5.5 3V1.5M10.5 3V1.5" />
      <path d="M5 9.5h2M9 9.5h2M5 12h2M9 12h2" />
    </svg>
  );
}

// Cell with highlight ring + right arrow — Read Cell
export function IconExcelReadCell({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="9" height="10" rx="1.5" />
      <path d="M1.5 7h9M5.5 3v10" />
      <path d="M12 8h3M13.5 6l2 2-2 2" />
    </svg>
  );
}

// Cell with pencil mark — Write Cell
export function IconExcelWriteCell({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="9" height="10" rx="1.5" />
      <path d="M1.5 7h9M5.5 3v10" />
      <path d="M12.5 5l2 2-3 3H9.5v-2l3-3Z" />
    </svg>
  );
}

// Multiple rows selected (bracket + lines) — Read Range
export function IconExcelReadRange({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="11" height="10" rx="1.5" />
      <path d="M1.5 6.5h11M1.5 10h11" />
      <path d="M5.5 3v10M9 3v10" />
      <path d="M14 5.5v5" strokeDasharray="1.5 1" />
      <path d="M13 5.5h1.5M13 10.5h1.5" />
    </svg>
  );
}

// Disk / save with small grid — Save Excel
export function IconExcelSave({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 13.5H2.5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1H11l2.5 2.5v8.5a1 1 0 0 1-1 1Z" />
      <rect x="4.5" y="2.5" width="4.5" height="3" rx=".5" />
      <rect x="4" y="8.5" width="8" height="4" rx=".5" />
      <path d="M6 10h4" />
    </svg>
  );
}

// Spreadsheet grid with X badge — Close Excel
export function IconExcelClose({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="9" height="10" rx="1.5" />
      <path d="M1.5 7h9M5.5 3v10" />
      <path d="M11.5 5l3.5 3.5M15 5l-3.5 3.5" />
    </svg>
  );
}

// ── Stage 5 — File System icons ───────────────────────────────

// Document + right-arrow exiting — Read File
export function IconReadFile({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 2H3.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6" />
      <path d="M8.5 2v3H11.5" />
      <path d="M10 10h5M12.5 7.5l2.5 2.5-2.5 2.5" />
    </svg>
  );
}

// Document + pencil — Write File
export function IconWriteFile({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 2H3.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7.5" />
      <path d="M8.5 2v3H11.5" />
      <path d="M11.5 3.5l2 2-4 4H7.5V7.5l4-4Z" />
    </svg>
  );
}

// Two doc outlines + transfer arrow — Move File
export function IconMoveFile({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 3.5h4v9h-4zM10.5 3.5h4v9h-4z" />
      <path d="M6.5 8h3M8 6l1.5 2L8 10" />
    </svg>
  );
}

// Document + X — Delete File
export function IconDeleteFile({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2H3.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7" />
      <path d="M8 2v3H11" />
      <path d="M10 5l3.5 3.5M13.5 5L10 8.5" />
    </svg>
  );
}

// Document + checkmark — File Exists
export function IconFileExists({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2H3.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7" />
      <path d="M8 2v3H11" />
      <path d="M10 10l1.5 1.5 2.5-3" />
    </svg>
  );
}

// Folder + plus — Create Directory
export function IconCreateDir({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 5V4a1 1 0 0 1 1-1H6l1.5 1.5H13a1 1 0 0 1 1 1V7" />
      <path d="M1.5 6.5H9.5v6H2.5a1 1 0 0 1-1-1V6.5Z" />
      <path d="M12 8v5M9.5 10.5h5" />
    </svg>
  );
}

// Folder + checkmark — Directory Exists
export function IconDirExists({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 5V4a1 1 0 0 1 1-1H6l1.5 1.5H10a1 1 0 0 1 1 1v1" />
      <path d="M1.5 6.5h9.5v6H2.5a1 1 0 0 1-1-1V6.5Z" />
      <path d="M10 11l1.5 1.5L14 9" />
    </svg>
  );
}

// ── Stage 4B — Data Processing icons ─────────────────────────

// { } braces with inner arrow — JSON Parse
export function IconJsonParse({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 2.5C3.2 2.5 2.5 3.2 2.5 4.5V6C2.5 6.8 2 7.3 1.5 7.8l.5.2C2.5 8.5 2.5 9 2.5 10V11.5c0 1.3.7 2 2 2" />
      <path d="M11.5 2.5c1.3 0 2 .7 2 2V6c0 .8.5 1.3 1 1.8l-.5.2c-.5.5-.5 1-.5 2V11.5c0 1.3-.7 2-2 2" />
      <path d="M6.5 8H9M7.5 6.5L9 8l-1.5 1.5" />
    </svg>
  );
}

// Two text stubs + right arrow — String Replace
export function IconStrReplace({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 5.5h5M1.5 10.5h5" />
      <path d="M8.5 8h5.5M11 5.5l3 2.5-3 2.5" />
    </svg>
  );
}

// Magnifier with tick inside — String Contains
export function IconStrContains({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10.2 10.2L14 14" />
      <path d="M4.5 6.5l1.5 1.5 2-2" />
    </svg>
  );
}

// Calendar grid with format arrow — Date Time Format
export function IconDateTime({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="10" height="9" rx="1.5" />
      <path d="M1.5 6.5h10M4.5 1.5v3M8.5 1.5v3" />
      <path d="M3.5 9.5h2M7 9.5h1.5" />
      <path d="M13 6l2.5 2L13 10" />
    </svg>
  );
}

// Square brackets with # hash — Array Length
export function IconArrLength({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2.5H2.5v11H4M12 2.5h1.5v11H12" />
      <path d="M6 6v4M9 6v4M5 8h5" />
    </svg>
  );
}

// ── Stage 4A icons ────────────────────────────────────────────

// Clock + URL address bar — Wait URL
export function IconWaitUrl({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 3.5h13" />
      <circle cx="8" cy="10" r="4.5" />
      <path d="M8 7.5v2.5l2 1.5" />
    </svg>
  );
}

// CSS selector brackets + small clock — Wait Element
export function IconWaitEl({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3H2.5v10H4M12 3h1.5v10H12" />
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 6.5V8l1 1" />
    </svg>
  );
}

// Document + refresh arc — Wait Page Load
export function IconWaitLoad({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 2H3.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1H8" />
      <path d="M7.5 2v3H11" />
      <path d="M11 9a3.5 3.5 0 1 0 3.5 3.5" />
      <path d="M14.5 9v3.5H11" />
    </svg>
  );
}

// Link + export arrow — Get Current URL
export function IconGetUrl({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 9.5a3 3 0 0 1 0-4.5l.5-.5a3 3 0 0 1 4 4L9.5 9" />
      <path d="M10 7a3 3 0 0 1 0 4l-.5.5a3 3 0 0 1-4-4L6 7" />
      <path d="M12.5 2h3v3M15.5 2l-3.5 3.5" />
    </svg>
  );
}

// Letter T + right arrow — Get Text
export function IconGetText({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4.5h7M6 4.5v7" />
      <path d="M10 10h5M12.5 7.5l2.5 2.5-2.5 2.5" />
    </svg>
  );
}

// Dashed element frame + check — Element Exists
export function IconExists({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="9" height="10" rx="1.5" strokeDasharray="2.5 1.5" />
      <path d="M11 9l2 2 3-3" />
    </svg>
  );
}

// ── Stage 3 icons ─────────────────────────────────────────────

// Diamond / branch — represents IF condition
export function IconCondition({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L14.5 8 8 14.5 1.5 8 8 1.5Z" />
      <path d="M8 5v3.5l2 1.5" />
    </svg>
  );
}

// Circular arrows — represents ForEach loop
export function IconLoop({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
      <path d="M8 1l3 1.5-3 1.5" />
    </svg>
  );
}

// Shield — represents TryCatch / error protection
export function IconShield({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L2.5 3.5V8c0 3 2.5 5 5.5 6.5C11 13 13.5 11 13.5 8V3.5L8 1.5Z" />
      <path d="M5.5 8l2 2 3-3" />
    </svg>
  );
}

// ── Stage 2 icons ─────────────────────────────────────────────

// { } curly braces — represents a variable
export function IconVariable({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3C3.5 3 3 3.8 3 5v1.5C3 7.3 2.3 7.8 1.5 8 2.3 8.2 3 8.7 3 9.5V11c0 1.2.5 2 2 2" />
      <path d="M11 3c1.5 0 2 .8 2 2v1.5c0 .8.7 1.3 1.5 1.5-.8.2-1.5.7-1.5 1.5V11c0 1.2-.5 2-2 2" />
    </svg>
  );
}

// Clock / timer — represents Delay
export function IconClock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5l2.5 1.5" />
    </svg>
  );
}

// Bidirectional arrows — represents HTTP / API call
export function IconAPI({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5h12M11 2l3 3-3 3" />
      <path d="M14 11H2M5 8l-3 3 3 3" />
    </svg>
  );
}

// Document with bullets — represents Log Message
export function IconLog({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" />
      <circle cx="3.5" cy="6"    r=".5" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="8.5"  r=".5" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="11"   r=".5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Stage 11 — Controller ────────────────────────────────────

// Grid of connected nodes — Controller Dashboard
export function IconDashboard({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
      <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1" />
      <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1" />
      <rect x="9"   y="9"   width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

// Robot / agent head — Robot node
export function IconRobot({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="10" height="8" rx="1.5" />
      <path d="M6 9h.5M9.5 9h.5" strokeWidth="2" />
      <path d="M6 11.5h4" />
      <path d="M8 5V3M6 3h4" />
    </svg>
  );
}

// ── Stage 9 — Scheduler ───────────────────────────────────────

// Calendar with clock indicator — Task Scheduler
export function IconScheduler({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="13" height="11" rx="1.5" />
      <path d="M1.5 6.5h13M5 1.5v3M11 1.5v3" />
      <circle cx="10.5" cy="11" r="2.5" />
      <path d="M10.5 9.5v1.5l1 1" />
    </svg>
  );
}

// ── Stage 8 — Production Lifecycle ────────────────────────────

// Upload arrow over a bar — Publish
export function IconPublish({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10V3M5 6l3-3 3 3" />
      <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

// Clock face — Run History
export function IconHistory({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5l2.5 1.5" />
    </svg>
  );
}

// ── Stage 7 — Database ────────────────────────────────────────

export function IconDbConnect({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="8" cy="4.5" rx="5" ry="1.8"/>
      <path d="M3 4.5v4c0 1 2.24 1.8 5 1.8s5-.8 5-1.8v-4"/>
      <line x1="12.5" y1="11" x2="14.5" y2="11"/>
      <line x1="13.5" y1="10" x2="13.5" y2="12"/>
    </svg>
  );
}

export function IconDbQuery({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="7.5" cy="4.5" rx="4.5" ry="1.8"/>
      <path d="M3 4.5v4c0 1 2 1.8 4.5 1.8"/>
      <circle cx="11.5" cy="11.5" r="2.5"/>
      <line x1="13.5" y1="13.5" x2="15" y2="15"/>
    </svg>
  );
}

export function IconDbExecute({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="7.5" cy="4.5" rx="4.5" ry="1.8"/>
      <path d="M3 4.5v4c0 1 2 1.8 4.5 1.8"/>
      <polygon points="11,9.5 15,12 11,14.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function IconDbDisconnect({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="7.5" cy="4.5" rx="4.5" ry="1.8"/>
      <path d="M3 4.5v4c0 1 2 1.8 4.5 1.8"/>
      <line x1="11" y1="10" x2="14.5" y2="13.5"/>
      <line x1="14.5" y1="10" x2="11" y2="13.5"/>
    </svg>
  );
}

// ── Tier-2 feature icons ──────────────────────────────────────

// Counter-clockwise arrow — Undo
export function IconUndo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 5.5H9a4 4 0 1 1 0 8H6" />
      <path d="M3.5 3L1.5 5.5 3.5 8" />
    </svg>
  );
}

// Clockwise arrow — Redo
export function IconRedo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 5.5H7a4 4 0 1 0 0 8h3" />
      <path d="M12.5 3l2 2.5-2 2.5" />
    </svg>
  );
}

// Bug silhouette — Debug / Breakpoint
export function IconBug({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12.5a3.5 3.5 0 0 1-3.5-3.5V6.5a3.5 3.5 0 0 1 7 0V9A3.5 3.5 0 0 1 8 12.5Z" />
      <path d="M6 5.5a2 2 0 0 1 4 0" />
      <path d="M1.5 8h3M11.5 8h3M3 5L5 7M13 5l-2 2M3 11.5L5.5 10M13 11.5L10.5 10" />
    </svg>
  );
}

// Play arrow with vertical bar on right — Step
export function IconPlayStep({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3,3 11,8 3,13" fill="currentColor" stroke="none" />
      <line x1="13" y1="3" x2="13" y2="13" strokeWidth="2" />
    </svg>
  );
}

// Copy — Copy selection
export function IconCopyNodes({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H3.5A1.5 1.5 0 0 0 2 3.5V9.5A1.5 1.5 0 0 0 3.5 11H5" />
    </svg>
  );
}

// ── Tier-3 icons ──────────────────────────────────────────────

// Scroll with lines — Audit Log
export function IconAudit({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2H4.5A1.5 1.5 0 0 0 3 3.5v9A1.5 1.5 0 0 0 4.5 14h7A1.5 1.5 0 0 0 13 12.5v-9A1.5 1.5 0 0 0 11.5 2Z" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </svg>
  );
}

// Networked robots — Remote Robot / Robot Network
export function IconRobotNetwork({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="8.5" width="4.5" height="5.5" rx="1" />
      <rect x="10.5" y="8.5" width="4.5" height="5.5" rx="1" />
      <rect x="5.5" y="1.5" width="5" height="5" rx="1" />
      <path d="M3.25 8.5V6.5H8M12.75 8.5V6.5H8M8 6.5V6" />
    </svg>
  );
}

// Bell — Notifications
export function IconBell({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6v3.5L2 11.5h12l-1.5-2V6A4.5 4.5 0 0 0 8 1.5Z" />
      <path d="M6.5 11.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

// Arrow down box — Export
export function IconExport({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

// Key — Credential Vault
export function IconKey({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5.5" r="3.5" />
      <path d="M8 8l5.5 5.5M11 11l1.5-1.5M13 13l1.5-1.5" />
    </svg>
  );
}

// ── Navigation / toolbar icons ────────────────────────────────

// Horizontal sliders — Run Parameters / Configuration (replaces the ⚡ bolt)
export function IconSliders({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4.5h7M11.5 4.5H14" />
      <path d="M2 11.5h2.5M7 11.5H14" />
      <circle cx="10" cy="4.5" r="1.6" fill="none" />
      <circle cx="5.5" cy="11.5" r="1.6" fill="none" />
    </svg>
  );
}

// Wrench — Tools / Utilities (replaces the sun-like gear)
export function IconTools({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.2a3.2 3.2 0 0 0-4.1 4l-5 5a1.6 1.6 0 0 0 2.3 2.3l5-5a3.2 3.2 0 0 0 4-4.1L11 4.9 9.5 4.1 9.1 2.5Z" />
    </svg>
  );
}
