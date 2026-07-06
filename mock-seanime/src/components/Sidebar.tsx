import {
  Blocks,
  BookOpen,
  CalendarDays,
  CloudOff,
  Compass,
  Download,
  Home,
  ListVideo,
  RefreshCcw,
  Search,
  Settings,
  Users,
} from "lucide-react";

const primary = [Home, Download, BookOpen, ListVideo, Compass, CalendarDays, Search, RefreshCcw, Users];

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Seanime navigation">
      <div className="seanime-mark" aria-label="Seanime">S</div>
      <nav>
        {primary.map((Icon, index) => (
          <button key={index} aria-label={`Navigation item ${index + 1}`}><Icon /></button>
        ))}
        <button className="active" aria-label="Extensions"><Blocks /></button>
      </nav>
      <div className="sidebar-bottom">
        <button aria-label="Offline"><CloudOff /></button>
        <button aria-label="Settings"><Settings /></button>
        <div className="avatar" aria-label="Hyperclaw">H</div>
      </div>
    </aside>
  );
}
