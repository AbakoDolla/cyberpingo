import type { ComponentType, SVGProps } from "react";
import {
  Activity, Archive, BookOpen, Binary, Bell, Bookmark, Braces, BrickWall, Briefcase, Bug, Building2, Cable, Calendar, Camera, ChartColumn,
  Check, CircleHelp, Clock, Cloud, Code, Cpu, Database, Download, Eye, EyeOff, File, FileSearch, FileText, Fingerprint, Flag, Flame, Folder, Gavel, Globe,
  GraduationCap, HardDrive, Hash, Heart, House, IdCard, Image as ImageIcon, Info, Key, Laptop, Layers, Lightbulb, Link, List, Lock, LockOpen, Mail, MapPin,
  MessageSquare, Monitor, Network, Package, Paperclip, Play, Plug, Printer, QrCode, Radar, RadioTower, RefreshCw, Route, Router, ScanSearch, Scale, Search,
  Server, Settings, Shield, ShieldAlert, ShieldCheck, Siren, Skull, Smartphone, Star, Store, Tablet, Target, Terminal, TriangleAlert, Upload, Usb, User,
  UserCheck, Users, VenetianMask, Watch, Wifi, Wrench, X, Zap,
  Ban, Boxes, Container, FileLock, Filter, FlaskConical, FolderOpen, Gauge, GitBranch, History, Inbox, LogIn, LogOut, Megaphone, Microscope, Puzzle, Send,
  Share2, Table, UserPlus, UserX, Workflow,
} from "lucide-react";
import type { FigureIcon } from "@/lib/figure-icons";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
type IconComponent = ComponentType<IconProps>;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A network switch: a flat box with its ports and a two-way arrow. Lucide has no drawing for it. */
function SwitchIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} {...props}>
      <rect x="2" y="10" width="20" height="9" rx="2.5" />
      <path d="M6.5 14.5h.01M10 14.5h.01M13.5 14.5h.01M17 14.5h.01" />
      <path d="M8 5h8M10 3 8 5l2 2M14 3l2 2-2 2" />
    </svg>
  );
}

/** A Wi-Fi access point: radio waves over its base. */
function AccessPointIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} {...props}>
      <path d="M4.5 9a10.5 10.5 0 0 1 15 0M7.5 12a6.2 6.2 0 0 1 9 0" />
      <path d="M12 15.5h.01" />
      <rect x="6" y="18" width="12" height="3.5" rx="1.5" />
    </svg>
  );
}

export const FIGURE_ICON_COMPONENTS: Record<FigureIcon, IconComponent> = {
  router: Router, switch: SwitchIcon, firewall: BrickWall, server: Server, pc: Monitor, laptop: Laptop, phone: Smartphone, tablet: Tablet, printer: Printer,
  camera: Camera, "access-point": AccessPointIcon, cloud: Cloud, internet: Globe, modem: Router, nas: HardDrive, usb: Usb, "badge-reader": IdCard, watch: Watch,
  wifi: Wifi, cable: Cable, antenna: RadioTower, network: Network, plug: Plug, chip: Cpu,
  shield: Shield, "shield-check": ShieldCheck, "shield-alert": ShieldAlert, lock: Lock, unlock: LockOpen, key: Key, fingerprint: Fingerprint, eye: Eye, "eye-off": EyeOff,
  bug: Bug, skull: Skull, flame: Flame, siren: Siren, radar: Radar, scan: ScanSearch, "file-search": FileSearch, mask: VenetianMask,
  database: Database, file: File, document: FileText, folder: Folder, archive: Archive, package: Package, mail: Mail, message: MessageSquare, paperclip: Paperclip,
  link: Link, hash: Hash, binary: Binary, braces: Braces, code: Code, terminal: Terminal, "qr-code": QrCode, image: ImageIcon, bookmark: Bookmark,
  user: User, users: Users, "user-check": UserCheck, building: Building2, store: Store, scale: Scale, gavel: Gavel, graduation: GraduationCap, book: BookOpen,
  "id-card": IdCard, briefcase: Briefcase, home: House,
  clock: Clock, calendar: Calendar, bell: Bell, flag: Flag, target: Target, zap: Zap, activity: Activity, chart: ChartColumn, settings: Settings, wrench: Wrench,
  refresh: RefreshCw, play: Play, check: Check, close: X, alert: TriangleAlert, info: Info, help: CircleHelp, search: Search, download: Download, upload: Upload,
  pin: MapPin, layers: Layers, list: List, star: Star, heart: Heart, bulb: Lightbulb, route: Route,
  globe: Globe, "user-plus": UserPlus, "user-x": UserX, "log-in": LogIn, "log-out": LogOut, history: History, filter: Filter, gauge: Gauge, ban: Ban, send: Send,
  inbox: Inbox, share: Share2, boxes: Boxes, workflow: Workflow, microscope: Microscope, flask: FlaskConical, puzzle: Puzzle, megaphone: Megaphone,
  container: Container, "git-branch": GitBranch, "file-lock": FileLock, "folder-open": FolderOpen, table: Table, "hard-drive": HardDrive, monitor: Monitor,
};

export function FigureGlyph({ name, size = 20, className }: { name: FigureIcon; size?: number; className?: string }) {
  const Icon = FIGURE_ICON_COMPONENTS[name];
  return <Icon size={size} className={className} aria-hidden="true" focusable="false" />;
}
