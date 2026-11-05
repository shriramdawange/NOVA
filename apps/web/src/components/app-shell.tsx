"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, FileText, LayoutDashboard, Package, Receipt, RotateCcw, Settings, ShoppingCart, Truck, Users, Tags, ShieldCheck, Store } from "lucide-react";

const groups = [
  { label: "Workspace", items: [["/", "Overview", LayoutDashboard], ["/pos", "Point of sale", ShoppingCart], ["/sales", "Sales", Receipt], ["/documents", "Documents", FileText]] },
  { label: "Manage", items: [["/products", "Products", Package], ["/inventory", "Inventory", Boxes], ["/purchase-orders", "Purchasing", Truck], ["/returns", "Returns", RotateCcw], ["/customers", "Customers", Users], ["/suppliers", "Suppliers", Store]] },
  { label: "Insights", items: [["/reports", "Reports & GST", BarChart3], ["/barcode-labels", "Barcode labels", Tags], ["/settings", "Settings", Settings]] },
  { label: "NOVA", items: [["/admin", "Platform admin", ShieldCheck]] },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-frame"><aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">N</span><span>NOVA<small>RETAIL OPERATING SYSTEM</small></span></Link><div className="workspace-switch"><span className="workspace-icon">G</span><span>GenSolutions Retail<small>Main branch</small></span><span className="chevron">⌄</span></div><nav>{groups.map(group => <section className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([href,label,Icon]) => <Link href={href} key={href} className={pathname === href || (href !== "/" && pathname.startsWith(href)) ? "nav-link active" : "nav-link"}><Icon size={17}/><span>{label}</span></Link>)}</section>)}</nav><div className="sidebar-bottom"><div className="avatar">S</div><div>Shree Dawange<small>Workspace owner</small></div><Link href="/settings" className="settings-link"><Settings size={17}/></Link></div></aside><main className="main-area"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {pathname === "/" ? "Overview" : pathname.slice(1).replaceAll("-", " ")}</div><div className="top-actions"><span className="status-dot"/> All systems normal <span className="top-divider"/> <span className="avatar small">S</span></div></header><div className="page-content">{children}</div></main></div>;
}
