"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080808]/80 backdrop-blur-xl border-b border-white/10 py-3 shadow-2xl"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-violet-500 flex items-center justify-center p-[1px] shadow-lg shadow-blue-500/20 group-hover:scale-105 transition duration-300">
            <div className="w-full h-full bg-[#0d0d11] rounded-[11px] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Razorpay
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                v2.0
              </span>
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <a
            href="#how-it-works"
            className="text-sm text-zinc-300 hover:text-white px-3 py-1 rounded-full transition hover:bg-white/[0.06]"
          >
            How It Works
          </a>
          <a
            href="#simulator"
            className="text-sm text-zinc-300 hover:text-white px-3 py-1 rounded-full transition hover:bg-white/[0.06]"
          >
            Live Simulator
          </a>
          <a
            href="#features"
            className="text-sm text-zinc-300 hover:text-white px-3 py-1 rounded-full transition hover:bg-white/[0.06]"
          >
            Capabilities
          </a>
          <a
            href="#architecture"
            className="text-sm text-zinc-300 hover:text-white px-3 py-1 rounded-full transition hover:bg-white/[0.06]"
          >
            Architecture
          </a>
        </nav>

        {/* Auth & CTA Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Gateway
          </div>

          <Show when="signed-out">
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="text-sm font-medium text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/25 hover:bg-white/[0.05] transition cursor-pointer">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="text-sm font-medium px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white hover:opacity-90 transition shadow-lg shadow-blue-500/25 cursor-pointer font-sans">
                Get Started
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="text-sm font-medium px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 transition"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-3 pb-6 bg-[#0c0c0e] border-b border-white/10 space-y-3">
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-2"
          >
            How It Works
          </a>
          <a
            href="#simulator"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-2"
          >
            Live Simulator
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-2"
          >
            Capabilities
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-2"
          >
            Architecture
          </a>
        </div>
      )}
    </header>
  );
}
