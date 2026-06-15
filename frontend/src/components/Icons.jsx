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

// Cyclone logo — flat geometric square with "Cy" monogram
export function LogoMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#2563EB" />
      <path
        d="M5 10.5V9.5C5 7.3 6.5 6 8.5 6C9.7 6 10.7 6.5 11.3 7.2L10.2 8.3C9.8 7.8 9.2 7.5 8.5 7.5C7.3 7.5 6.5 8.3 6.5 9.5V10.5C6.5 11.7 7.3 12.5 8.5 12.5C9.2 12.5 9.8 12.2 10.2 11.7L11.3 12.8C10.7 13.5 9.7 14 8.5 14C6.5 14 5 12.7 5 10.5Z"
        fill="white"
      />
      <path
        d="M13 6H14.5L12 10V14H10.5V10L8 6H9.5L11.25 9.2L13 6Z"
        fill="white"
      />
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
