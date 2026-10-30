import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const Play = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
  </svg>
);

export const Pause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="4.5" width="4" height="15" rx="1.3" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.3" />
  </svg>
);

export const Plus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Search = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const ScanEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M4.5 12s2.7-4 7.5-4 7.5 4 7.5 4-2.7 4-7.5 4-7.5-4-7.5-4Z" />
    <circle cx="12" cy="12" r="1.8" />
  </svg>
);

export const ChevronLeft = (p: P) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ChevronDown = (p: P) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <path d="m5 9 7 7 7-7" />
  </svg>
);

export const ChevronUp = (p: P) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <path d="m5 15 7-7 7 7" />
  </svg>
);

export const Volume = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
    <path d="M15.8 9a4 4 0 0 1 0 6" />
    <path d="M18.3 6.6a7.5 7.5 0 0 1 0 10.8" />
  </svg>
);

export const VolumeOff = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
    <path d="m16 10 4 4M20 10l-4 4" />
  </svg>
);

export const Expand = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" />
  </svg>
);

export const Collapse = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4v5H4M15 20v-5h5M15 4v5h5M9 20v-5H4" />
  </svg>
);

export const Pip = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <rect x="12" y="11" width="7" height="6" rx="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const Info = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8v.6" />
  </svg>
);

export const Globe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
    <path d="M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
  </svg>
);

export const Heart = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.4-7.5-9.3A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.5C19.5 15.6 12 20 12 20Z" />
  </svg>
);

export const Shuffle = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 4h4v4M21 4l-6.5 6.5M17 20h4v-4M21 20l-6.5-6.5M3 5h2.5l2.8 3M3 19h2.5L14 9" />
  </svg>
);

export const Settings = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.2a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.46V20a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9.1 18.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.46-1.1 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.46V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.46 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.2Z" />
  </svg>
);

export const Lock = (p: P) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
    <path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" />
  </svg>
);

export const Radio = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="8" width="18" height="12" rx="2.5" />
    <circle cx="15.5" cy="14" r="3" />
    <path d="M7 12.5h3M7 16h3M7.5 8 17 4" />
  </svg>
);

export const Tv = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="6.5" width="18" height="12" rx="2.5" />
    <path d="m8 2.8 4 3.7 4-3.7" />
  </svg>
);

export const Cam = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h7A2.5 2.5 0 0 1 15 8.5v7A2.5 2.5 0 0 1 12.5 18h-7A2.5 2.5 0 0 1 3 15.5Z" />
    <path d="m15 11 5.2-3v8L15 13Z" />
  </svg>
);

export const Grid = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </svg>
);

export const Refresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 1 0-.7 4.3" />
    <path d="M20 4.5V11h-6.3" />
  </svg>
);

export const Skip = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6 5.6v12.8a1 1 0 0 0 1.53.85l9-6.4a1 1 0 0 0 0-1.7l-9-6.4A1 1 0 0 0 6 5.6Z" />
    <rect x="17" y="5" width="2.6" height="14" rx="1.1" />
  </svg>
);

export const Back = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M18 5.6v12.8a1 1 0 0 1-1.53.85l-9-6.4a1 1 0 0 1 0-1.7l9-6.4A1 1 0 0 1 18 5.6Z" />
    <rect x="4.4" y="5" width="2.6" height="14" rx="1.1" />
  </svg>
);

export const Bolt = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M13.5 2 4 13.2h6L9.6 22 20 10.3h-6.3Z" />
  </svg>
);
