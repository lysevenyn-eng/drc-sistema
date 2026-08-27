type IconProps = { className?: string };

function Base({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
);

export const IconHerd = (p: IconProps) => (
  <Base {...p}>
    <circle cx="8" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M3 20c0-3 2.2-5 5-5s5 2 5 5" />
    <path d="M13.2 20c.3-2.2 1.8-3.8 3.8-3.8s3.5 1.5 3.8 3.5" />
  </Base>
);

export const IconRepro = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20s-7-4.4-9-8.3C1.6 8.4 3.4 5.5 6.5 5c2-.3 3.7.8 5.5 2.7C13.8 5.8 15.5 4.7 17.5 5c3.1.5 4.9 3.4 3.5 6.7C19 15.6 12 20 12 20Z" />
  </Base>
);

export const IconScale = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v18" />
    <path d="M6 7h12" />
    <path d="M3 7l3-4 3 4-3 5-3-5Z" />
    <path d="M15 7l3-4 3 4-3 5-3-5Z" />
    <path d="M8 21h8" />
  </Base>
);

export const IconTasks = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="17" rx="2" />
    <path d="M8 2.5v3M16 2.5v3M4 9.5h16" />
    <path d="M8.5 13.5l2 2 4-4" />
  </Base>
);

export const IconTrade = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h13l-2.5-2.5M20 17H7l2.5 2.5" />
    <path d="M4 7l2.5-2.5M20 17l-2.5 2.5" />
  </Base>
);

export const IconFinance = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Base>
);

export const IconWallet = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
  </Base>
);

export const IconAdmin = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 7.7-7 10-4-2.3-7-5.5-7-10V6l7-3Z" />
  </Base>
);

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Base>
);

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Base>
);

export const IconReport = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M8 17v-4M12 17V9M16 17v-7" />
  </Base>
);

export const IconChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Base>
);

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);
