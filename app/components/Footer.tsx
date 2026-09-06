import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#051937] text-white py-16 md:py-20 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-800/80">
          {/* Brand & Tagline */}
          <div className="col-span-2">
            <Link href="/" className="inline-block transition-transform hover:scale-105" aria-label="Vibe Home">
              <Image
                src="/vibe-logo-white.svg"
                alt="Vibe"
                width={130}
                height={48}
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </Link>

            <p className="mt-2 text-xs sm:text-sm font-bold tracking-widest text-slate-300 uppercase">
              Smarter Deals, Better Vibes.
            </p>

            <p className="mt-4 text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed font-normal">
              India&apos;s intelligent multi-store fashion price comparison platform. Find the best verified deals across top online retailers.
            </p>
          </div>

          {/* COMPANY */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Company</h4>
            <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-300">
              <li><Link href="/" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* HELP */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Help</h4>
            <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-300">
              <li><Link href="/" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Shipping</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Returns</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* LEGAL & FOLLOW US */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Legal</h4>
            <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-300">
              <li><span className="hover:text-white transition-colors cursor-pointer">Terms of Use</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Disclaimer</span></li>
            </ul>

            <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-white">Follow Us</h4>
            <div className="mt-3 flex items-center gap-3 text-slate-300">
              {/* Instagram */}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-[#FF5126] hover:text-white transition cursor-pointer" aria-label="Instagram">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </span>
              {/* Twitter / X */}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-[#1A73E8] hover:text-white transition cursor-pointer" aria-label="Twitter">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </span>
              {/* Facebook */}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-[#1A73E8] hover:text-white transition cursor-pointer" aria-label="Facebook">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.595 0 9 1.582 9 4.615V8z"/></svg>
              </span>
              {/* YouTube */}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-[#FF5126] hover:text-white transition cursor-pointer" aria-label="YouTube">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </span>
            </div>
          </div>
        </div>

        {/* Affiliate Disclosure */}
        <div className="mt-8 border-t border-slate-800/60 pt-6 text-center text-xs text-slate-400">
          <p>
            As an Amazon Associate I earn from qualifying purchases.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Vibe. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Built for smart fashion shoppers</span>
            <span>·</span>
            <span className="text-white font-semibold">Real-Time Deal Engine</span>
          </p>
        </div>
      </div>
    </footer>
  );
}