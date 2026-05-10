"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href: string;
  children?: { name: string; href: string }[];
}

const navItems: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  {
    name: "Programs",
    href: "/#programs",
    children: [
      { name: "Exposure Trips", href: "/programs/exposure-trips" },
      { name: "Workshops", href: "/programs/workshops" },
      { name: "Corporate Workshops", href: "/programs/corporate-workshops" },
      { name: "Teacher Workshops", href: "/programs/teacher-workshops" },
      { name: "Events", href: "/programs/events" },
      { name: "Competitions", href: "/programs/competitions" },
    ],
  },
  {
    name: "Partners",
    href: "/#contact",
    children: [
      { name: "Schools", href: "/partners/schools" },
      { name: "Parents", href: "/partners/parents" },
      { name: "CSR Initiatives", href: "/partners/csr" },
    ],
  },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact" },
];

function DesktopDropdown({ item, isLight }: { item: NavItem; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const enter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };
  const leave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-xl",
          isLight
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-muted hover:text-foreground hover:bg-primary/5"
        )}
      >
        {item.name}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </Link>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 pt-1 z-50"
          >
            <div className="bg-white rounded-2xl border border-primary/10 shadow-xl py-2 min-w-[200px]">
              {item.children!.map((child) => (
                <Link
                  key={child.name}
                  href={child.href}
                  className="block px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-primary/5 transition-colors"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  // When not scrolled on a subpage, use light (white) text
  const isLight = !isHome && !isScrolled;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
        className={cn(
          "transition-all duration-300 border-b",
          isScrolled
            ? "bg-white/80 backdrop-blur-xl border-primary/10 shadow-sm"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="SkillFleet"
                width={160}
                height={44}
                className={cn("h-7 sm:h-10 w-auto", isLight && "brightness-0 invert")}
                priority
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) =>
                item.children ? (
                  <DesktopDropdown key={item.name} item={item} isLight={isLight} />
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors rounded-xl",
                      isLight
                        ? "text-white/80 hover:text-white hover:bg-white/10"
                        : "text-muted hover:text-foreground hover:bg-primary/5"
                    )}
                  >
                    {item.name}
                  </Link>
                )
              )}
            </div>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href="/contact">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(isLight && "bg-transparent border-white/30 text-white hover:bg-white/10")}
                >
                  Contact Us
                </Button>
              </Link>
              <a
                href="https://wa.me/917508807490?text=Hi%2C%20i'm%20interested%20to%20know%20more%20about%20SkillFleet!"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm">Enroll Now</Button>
              </a>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className={cn(
                "lg:hidden p-2 rounded-xl transition-colors cursor-pointer",
                isLight ? "text-white hover:bg-white/10" : "hover:bg-primary/5"
              )}
              aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait">
                {isMobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-primary/10 shadow-xl overflow-hidden"
            >
              <div className="px-4 py-6 space-y-1">
                {navItems.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {item.children ? (
                      <>
                        <button
                          onClick={() =>
                            setMobileExpanded(
                              mobileExpanded === item.name ? null : item.name
                            )
                          }
                          className="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-muted hover:text-foreground hover:bg-primary/5 rounded-xl transition-colors cursor-pointer"
                        >
                          {item.name}
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 transition-transform",
                              mobileExpanded === item.name && "rotate-180"
                            )}
                          />
                        </button>
                        <AnimatePresence>
                          {mobileExpanded === item.name && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-6 space-y-1 pb-2">
                                {item.children.map((child) => (
                                  <Link
                                    key={child.name}
                                    href={child.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-primary/5 rounded-xl transition-colors"
                                  >
                                    {child.name}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className="block px-4 py-3 text-base font-medium text-muted hover:text-foreground hover:bg-primary/5 rounded-xl transition-colors"
                      >
                        {item.name}
                      </Link>
                    )}
                  </motion.div>
                ))}
                <div className="pt-4 flex flex-col gap-3">
                  <Link href="/contact">
                    <Button variant="outline" className="w-full">
                      Contact Us
                    </Button>
                  </Link>
                  <a
                    href="https://wa.me/917508807490?text=Hi%2C%20i'm%20interested%20to%20know%20more%20about%20SkillFleet!"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full">Enroll Now</Button>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}
