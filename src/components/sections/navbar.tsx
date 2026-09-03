"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ChevronDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isNavScrolled, shouldUseLightNav } from "./nav-appearance";

interface NavNode {
  name: string;
  href: string;
  children?: NavNode[];
}

type NavItem = NavNode;

const navItems: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  {
    name: "Programs",
    href: "/#programs",
    children: [
      {
        name: "For Schools",
        href: "/partners/schools",
        children: [
          { name: "Exposure Trips", href: "/programs/exposure-trips" },
          {
            name: "Workshops",
            href: "/programs/workshops",
            children: [
              { name: "AI for Teachers", href: "/programs/teacher-workshops" },
              { name: "AI for Students", href: "/programs/student-workshops" },
            ],
          },
          { name: "Events", href: "/programs/events" },
          { name: "Competitions", href: "/programs/competitions" },
          { name: "Internships", href: "/programs/internships" },
        ],
      },
      { name: "For CSRs", href: "/partners/csr" },
      {
        name: "For Corporates",
        href: "/programs/corporate-workshops",
        children: [
          { name: "Workshop", href: "/programs/corporate-workshops" },
        ],
      },
    ],
  },
  {
    name: "Partners",
    href: "/#contact",
    children: [
      { name: "Schools", href: "/partners/schools" },
      { name: "Parents", href: "/partners/parents" },
      { name: "Corporates", href: "/partners/csr" },
      { name: "CSR Initiatives", href: "/partners/csr" },
    ],
  },
  { name: "Blog", href: "/blog" },
  // No "Contact" link here: the Contact Us button in the CTA group already
  // goes to /contact, and two controls to the same page in one bar is a
  // decision the reader has to make for no reason.
];

function DesktopSubItem({ child }: { child: NavNode }) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (!child.children) {
    return (
      <Link
        href={child.href}
        className="block px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-primary/5 transition-colors"
      >
        {child.name}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => { clearTimeout(timeout.current); setOpen(true); }}
      onMouseLeave={() => { timeout.current = setTimeout(() => setOpen(false), 150); }}
    >
      <Link
        href={child.href}
        className="flex items-center justify-between px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-primary/5 transition-colors"
      >
        {child.name}
        <ChevronDown className={cn("w-3 h-3 -rotate-90", open && "rotate-0")} />
      </Link>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-full top-0 pl-1 z-50"
          >
            <div className="bg-white rounded-2xl border border-primary/10 shadow-xl py-2 min-w-[180px]">
              {child.children.map((sub) => (
                <DesktopSubItem key={sub.name} child={sub} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
                <DesktopSubItem key={child.name} child={child} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNavNode({
  node,
  expanded,
  setExpanded,
  onNavigate,
  depth,
}: {
  node: NavNode;
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  onNavigate: () => void;
  depth: number;
}) {
  const isOpen = expanded.has(node.name);
  const toggle = () =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(node.name)) next.delete(node.name);
      else next.add(node.name);
      return next;
    });

  if (!node.children) {
    return (
      <Link
        href={node.href}
        onClick={onNavigate}
        className={cn(
          "block px-4 rounded-xl transition-colors text-muted hover:text-foreground hover:bg-primary/5",
          depth === 0 ? "py-3 text-base font-medium" : "py-2.5 text-sm"
        )}
      >
        {node.name}
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between px-4 rounded-xl transition-colors cursor-pointer text-muted hover:text-foreground hover:bg-primary/5",
          depth === 0 ? "py-3 text-base font-medium" : "py-2.5 text-sm font-medium"
        )}
      >
        {node.name}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 space-y-1 pb-1">
              {node.children.map((child) => (
                <MobileNavNode
                  key={child.name}
                  node={child}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  onNavigate={onNavigate}
                  depth={depth + 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Navbar({ hasBanner = false }: { hasBanner?: boolean } = {}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Set<string>>(new Set());
  // Light (white) text and logo, which is only legible over a subpage's
  // purple banner. Whether there is one is declared by the layout — see
  // nav-appearance.ts for why it is not read from the pathname.
  const isLight = shouldUseLightNav({ hasBanner, isScrolled, isMenuOpen: isMobileOpen });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(isNavScrolled(window.scrollY));

    /*
      Read the position we mounted at before listening. The page is often
      already scrolled by then — pull-to-refresh part-way down, a reload, the
      browser restoring the offset on back-navigation, or a deep link to an
      anchor — and none of those fire a scroll event we would catch. Listening
      alone left `isScrolled` false on a scrolled subpage, which kept the logo
      inverted to solid white over the white page body until the reader
      happened to scroll.
    */
    handleScroll();

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
          // The open mobile menu is a white sheet, so the bar above it has to
          // be solid too — otherwise the sheet appears to hang off a
          // transparent strip, and the dark logo lands on the purple banner.
          isScrolled || isMobileOpen
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

            {/* Desktop Nav. flex-1 + centre rather than leaving it to
                justify-between: with one link fewer the group would otherwise
                sit off to the left with a gap before the buttons. */}
            <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
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

              {/*
                ISC 2026 is a campaign destination rather than an ordinary
                section, so it reads as a bubble among the plain text links.
                The pill carries its own contrast, which is why it needs no
                `isLight` variant the way the text links do.
              */}
              <Link
                href="/isc"
                className="ml-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent-teal px-3.5 py-2 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(116,71,225,0.85)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-8px_rgba(116,71,225,0.95)]"
              >
                <Trophy className="h-3.5 w-3.5" />
                ISC 2026
              </Link>
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
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(isLight && "bg-transparent border-white/30 text-white hover:bg-white/10")}
                >
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Enroll Now</Button>
              </Link>
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
                <Link
                  href="/isc"
                  onClick={() => setIsMobileOpen(false)}
                  className="mb-3 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent-teal px-4 py-3 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(116,71,225,0.85)]"
                >
                  <Trophy className="h-4 w-4" />
                  ISC 2026
                </Link>
                {navItems.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {item.children ? (
                      <MobileNavNode
                        node={item}
                        expanded={mobileExpanded}
                        setExpanded={setMobileExpanded}
                        onNavigate={() => setIsMobileOpen(false)}
                        depth={0}
                      />
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
                  <Link href="/login" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/contact" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Contact Us
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsMobileOpen(false)}>
                    <Button className="w-full">Enroll Now</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}
