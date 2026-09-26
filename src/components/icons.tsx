/** Pictogrammes administratifs porkoniais — dessins originaux (SVG inline). */
import type { ReactElement } from "react";

type P = { size?: number; className?: string };

const wrap = (size: number, className: string | undefined, children: ReactElement | ReactElement[]) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
    {children}
  </svg>
);

export const IconGroin = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <circle key="a" cx="16" cy="16" r="14" fill="#f4a7b9" stroke="#b04a68" strokeWidth="2" />,
    <ellipse key="b" cx="16" cy="18" rx="8" ry="6" fill="#e27895" stroke="#b04a68" strokeWidth="1.5" />,
    <ellipse key="c" cx="13" cy="18" rx="1.6" ry="2.4" fill="#6b1f35" />,
    <ellipse key="d" cx="19" cy="18" rx="1.6" ry="2.4" fill="#6b1f35" />,
  ]);

export const IconDashboard = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="3" y="5" width="26" height="19" rx="2" fill="#dbe7fb" stroke="#1c4fd0" strokeWidth="2" />,
    <rect key="b" x="7" y="15" width="4" height="6" fill="#3c8d2f" />,
    <rect key="c" x="14" y="11" width="4" height="10" fill="#d98a13" />,
    <rect key="d" x="21" y="8" width="4" height="13" fill="#1c4fd0" />,
    <rect key="e" x="12" y="25" width="8" height="3" fill="#716f64" />,
  ]);

export const IconPerson = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="3" y="3" width="26" height="26" rx="2" fill="#fff8e5" stroke="#8a5a00" strokeWidth="2" />,
    <circle key="b" cx="16" cy="13" r="5" fill="#f1c6a6" stroke="#8a5a00" strokeWidth="1.5" />,
    <path key="c" d="M7 27c1-6 5-8 9-8s8 2 9 8" fill="#1c4fd0" />,
  ]);

export const IconScroll = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="6" y="3" width="20" height="26" fill="#fff" stroke="#35557a" strokeWidth="2" />,
    <path key="b" d="M10 9h12M10 13h12M10 17h12M10 21h8" stroke="#7f9db9" strokeWidth="2" />,
    <path key="c" d="M20 22l6 6" stroke="#3c8d2f" strokeWidth="3" />,
  ]);

export const IconCamera = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="2" y="9" width="28" height="19" rx="3" fill="#6f7a8a" stroke="#2f3640" strokeWidth="1.5" />,
    <rect key="b" x="10" y="5" width="10" height="5" fill="#2f3640" />,
    <circle key="c" cx="16" cy="18" r="6" fill="#9dbdf5" stroke="#fff" strokeWidth="2" />,
    <rect key="d" x="24" y="11" width="4" height="3" fill="#ffd98a" />,
  ]);

export const IconBook = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <path key="a" d="M4 5h11v23H6a2 2 0 0 1-2-2z" fill="#7a263a" />,
    <path key="b" d="M17 5h11v21a2 2 0 0 1-2 2h-9z" fill="#9a3a50" />,
    <path key="c" d="M8 10h4M20 10h4" stroke="#e8c26a" strokeWidth="2" />,
    <circle key="d" cx="16" cy="17" r="3" fill="#e8c26a" />,
  ]);

export const IconRobot = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="5" y="9" width="22" height="17" rx="3" fill="#dbe7fb" stroke="#1c4fd0" strokeWidth="2" />,
    <rect key="b" x="10" y="14" width="4" height="4" fill="#3c8d2f" />,
    <rect key="c" x="18" y="14" width="4" height="4" fill="#3c8d2f" />,
    <path key="d" d="M16 3v6M11 22h10" stroke="#1c4fd0" strokeWidth="2" />,
  ]);

export const IconStamp = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="12" y="3" width="8" height="12" rx="3" fill="#8a5a00" />,
    <rect key="b" x="5" y="15" width="22" height="6" rx="1" fill="#d98a13" stroke="#8a5a00" strokeWidth="1.5" />,
    <rect key="c" x="4" y="24" width="24" height="4" fill="#b3261e" />,
  ]);

export const IconArchive = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="3" y="5" width="26" height="7" fill="#d98a13" stroke="#8a5a00" strokeWidth="1.5" />,
    <rect key="b" x="5" y="12" width="22" height="16" fill="#ffd98a" stroke="#8a5a00" strokeWidth="1.5" />,
    <rect key="c" x="12" y="15" width="8" height="3" fill="#8a5a00" />,
  ]);

export const IconTrash = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <path key="a" d="M7 9h18l-2 19H9z" fill="#dbe7fb" stroke="#35557a" strokeWidth="2" />,
    <rect key="b" x="5" y="5" width="22" height="4" fill="#35557a" />,
    <path key="c" d="M13 13v11M19 13v11" stroke="#7f9db9" strokeWidth="2" />,
  ]);

export const IconLog = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="5" y="3" width="22" height="26" fill="#fff" stroke="#716f64" strokeWidth="2" />,
    <path key="b" d="M9 9h3M9 14h3M9 19h3M9 24h3M14 9h9M14 14h9M14 19h9M14 24h6" stroke="#1c4fd0" strokeWidth="2" />,
  ]);

export const IconShield = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <path key="a" d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7z" fill="#3c8d2f" stroke="#245a1a" strokeWidth="2" />,
    <path key="b" d="M11 16l4 4 7-8" stroke="#fff" strokeWidth="3" fill="none" />,
  ]);

export const IconWarning = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <path key="a" d="M16 3l14 25H2z" fill="#ffd98a" stroke="#8a5a00" strokeWidth="2" />,
    <path key="b" d="M16 12v8" stroke="#000" strokeWidth="3" />,
    <circle key="c" cx="16" cy="24" r="1.8" fill="#000" />,
  ]);

export const IconError = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <circle key="a" cx="16" cy="16" r="13" fill="#d8352a" stroke="#8a1a12" strokeWidth="2" />,
    <path key="b" d="M11 11l10 10M21 11L11 21" stroke="#fff" strokeWidth="3.5" />,
  ]);

export const IconInfo = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <circle key="a" cx="16" cy="16" r="13" fill="#3a7bf0" stroke="#0a2a8a" strokeWidth="2" />,
    <circle key="b" cx="16" cy="10" r="2" fill="#fff" />,
    <path key="c" d="M16 14v10" stroke="#fff" strokeWidth="3.5" />,
  ]);

export const IconExport = ({ size = 16, className }: P) =>
  wrap(size, className, [
    <rect key="a" x="4" y="12" width="24" height="16" fill="#dbe7fb" stroke="#1c4fd0" strokeWidth="2" />,
    <path key="b" d="M16 3v15M10 9l6-6 6 6" stroke="#3c8d2f" strokeWidth="3" fill="none" />,
  ]);

/** Sceau de la République de Porkonia (dessin original). */
export const IconSeal = ({ size = 32, className }: P) =>
  wrap(size, className, [
    <circle key="a" cx="16" cy="16" r="15" fill="#7a1016" />,
    <circle key="b" cx="16" cy="16" r="12.5" fill="none" stroke="#c98a1c" strokeWidth="1.2" strokeDasharray="1.5 1.5" />,
    <circle key="c" cx="16" cy="16" r="9.5" fill="#f2c6cf" stroke="#c98a1c" strokeWidth="1.2" />,
    <ellipse key="d" cx="16" cy="17.5" rx="5" ry="3.8" fill="#d97a93" stroke="#7a1016" strokeWidth="1" />,
    <ellipse key="e" cx="14.2" cy="17.5" rx="1" ry="1.6" fill="#7a1016" />,
    <ellipse key="f" cx="17.8" cy="17.5" rx="1" ry="1.6" fill="#7a1016" />,
    <path key="g" d="M11 9.5l2 2.5 3-3.5 3 3.5 2-2.5-.8 3.2h-8.4z" fill="#c98a1c" />,
  ]);
