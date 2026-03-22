'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ClipboardList, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "홈", href: "/", icon: Home },
    { label: "검색", href: "/search", icon: Search },
    { label: "내 리포트", href: "/report/1", icon: ClipboardList },
    { label: "더보기", href: "/more", icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 z-50 flex h-[60px] w-full items-center justify-around border-t bg-background pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.replace('/1', '')));
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full min-h-[44px]", 
              isActive ? "text-trust-blue" : "text-muted-foreground"
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
