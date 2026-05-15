const PATHS = {
  home: <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-3v-6h-6v6H6a2 2 0 0 1-2-2z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>),
  plane: <path d="M3 14l7-1L20 3l-1 9-7 3-3 5-2-1z" />,
  hotel: (<><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></>),
  sparkle: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  check: <path d="M5 12l5 5 9-11" />,
  bell: <path d="M6 17V11a6 6 0 1 1 12 0v6l2 2H4zM10 21a2 2 0 0 0 4 0" />,
  vote: (<><path d="M9 11l2 2 5-5" /><rect x="3" y="3" width="18" height="18" rx="3" /></>),
  pin: (<><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  share: (<><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11l7.6-4M8.2 13l7.6 4" /></>),
  download: <path d="M12 3v13m-5-5l5 5 5-5M4 21h16" />,
  chat: <path d="M21 12a8 8 0 0 1-8 8H8l-4 3v-7a8 8 0 1 1 17-4z" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.4-4.4" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>),
};

export default function Icon({ name, size = 20, color = 'currentColor', className = '', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name] || <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
