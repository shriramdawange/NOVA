import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "NOVA · Retail OS", description: "The operating system for your retail business." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><AppShell>{children}</AppShell></body></html>; }
