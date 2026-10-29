import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: P) => (
  <Svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></Svg>
);
export const ImageIcon = (p: P) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></Svg>
);
export const QrIcon = (p: P) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" /></Svg>
);
export const ScanIcon = (p: P) => (
  <Svg {...p}><path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" /><path d="M4 12h16" /></Svg>
);
export const BackIcon = (p: P) => (<Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>);
export const CloseIcon = (p: P) => (<Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>);
export const PlusIcon = (p: P) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>);
export const SearchIcon = (p: P) => (<Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></Svg>);
export const DownloadIcon = (p: P) => (<Svg {...p}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></Svg>);
export const PencilIcon = (p: P) => (<Svg {...p}><path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z" /></Svg>);
export const TrashIcon = (p: P) => (<Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></Svg>);
export const FolderIcon = (p: P) => (<Svg {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></Svg>);
export const ShieldIcon = (p: P) => (<Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></Svg>);
export const LockIcon = (p: P) => (<Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></Svg>);
export const CheckIcon = (p: P) => (<Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>);
export const CameraIcon = (p: P) => (<Svg {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /><circle cx="12" cy="13" r="3.5" /></Svg>);
export const WarnIcon = (p: P) => (<Svg {...p}><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4M12 17v.01" /></Svg>);
export const ShareUpIcon = (p: P) => (<Svg {...p}><path d="M12 15V4M8 8l4-4 4 4" /><path d="M6 12H5a1 1 0 00-1 1v6a1 1 0 001 1h14a1 1 0 001-1v-6a1 1 0 00-1-1h-1" /></Svg>);
export const AddSquareIcon = (p: P) => (<Svg {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></Svg>);
export const MenuDotsIcon = (p: P) => (<Svg {...p}><path d="M12 5v.01M12 12v.01M12 19v.01" strokeWidth={3} /></Svg>);
