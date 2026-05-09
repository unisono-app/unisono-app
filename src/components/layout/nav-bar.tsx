"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Music, Users } from "lucide-react";

const tabs = [
  { href: "/practices", label: "ホーム", icon: Home },
  { href: "/annual", label: "年間スケジュール", icon: Calendar },
  { href: "/songs", label: "曲一覧", icon: Music },
  { href: "/members", label: "メンバー", icon: Users },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed z-40 bg-white border-gray-200
        bottom-0 left-0 right-0 border-t
        landscape:bottom-auto landscape:top-0 landscape:right-auto landscape:h-full landscape:w-16 landscape:border-t-0 landscape:border-r
      "
    >
      <ul
        className="
          flex justify-around items-center h-14
          landscape:flex-col landscape:justify-start landscape:gap-2 landscape:h-full landscape:w-full landscape:pt-4
        "
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`
                  flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors
                  landscape:px-3 landscape:py-2
                  ${isActive ? "text-black" : "text-gray-400 hover:text-gray-600"}
                `}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="landscape:hidden">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
