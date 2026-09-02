import Image from "next/image";

export interface VibeLoaderProps {
  /**
   * Whether to render as a full-screen fixed overlay or embedded container
   * @default false
   */
  fullScreen?: boolean;
  /**
   * Custom tagline or message to display below the logo
   * @default "SMARTER DEALS. BETTER VIBES."
   */
  tagline?: string;
  /**
   * Whether to display the brand tagline
   * @default true
   */
  showTagline?: boolean;
  /**
   * Size variant of the 3D Vibe logo
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * Additional custom CSS classes
   */
  className?: string;
  /**
   * Accessibility label
   * @default "Loading Vibe..."
   */
  ariaLabel?: string;
}

export default function VibeLoader({
  fullScreen = false,
  tagline = "SMARTER DEALS. BETTER VIBES.",
  showTagline = true,
  size = "md",
  className = "",
  ariaLabel = "Loading Vibe...",
}: VibeLoaderProps) {
  // Dimensions for responsive 3D logo
  const sizeMap = {
    sm: {
      width: 140,
      height: 60,
      wrapperClass: "w-[130px] sm:w-[150px]",
      taglineClass: "text-[10px] tracking-[0.2em]",
      auraClass: "w-36 h-36",
    },
    md: {
      width: 210,
      height: 90,
      wrapperClass: "w-[170px] sm:w-[210px]",
      taglineClass: "text-[11px] sm:text-xs tracking-[0.24em]",
      auraClass: "w-52 h-52 sm:w-64 sm:h-64",
    },
    lg: {
      width: 260,
      height: 112,
      wrapperClass: "w-[210px] sm:w-[260px]",
      taglineClass: "text-xs sm:text-sm tracking-[0.26em]",
      auraClass: "w-64 h-64 sm:w-80 sm:h-80",
    },
  };

  const selectedSize = sizeMap[size];

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={`relative flex flex-col items-center justify-center select-none text-center ${className}`}
    >
      {/* Subtle glowing ambient aura behind the 3D logo */}
      <div
        className={`absolute -z-10 rounded-full bg-gradient-to-tr from-[#FF5126]/12 via-[#1A73E8]/10 to-[#FFB703]/10 blur-2xl animate-vibe-glow pointer-events-none ${selectedSize.auraClass}`}
      />

      {/* Centered 3D Vibe Logo with subtle floating bounce */}
      <div className="relative animate-vibe-float transition-transform">
        <Image
          src="/vibe-logo.svg"
          alt="Vibe"
          width={selectedSize.width}
          height={selectedSize.height}
          priority
          className={`${selectedSize.wrapperClass} h-auto object-contain drop-shadow-sm`}
        />
      </div>

      {/* Brand Tagline */}
      {showTagline && (
        <div className={`mt-5 flex items-center justify-center gap-1.5 font-extrabold uppercase animate-vibe-tagline ${selectedSize.taglineClass}`}>
          <span className="text-gray-800">SMARTER DEALS.</span>
          <span className="bg-gradient-to-r from-[#FF5126] to-[#1A73E8] bg-clip-text text-transparent">
            {tagline.includes("BETTER VIBES") ? "BETTER VIBES." : tagline}
          </span>
        </div>
      )}

      {/* Subtle brand color accent line */}
      <div className="mt-3.5 h-1 w-16 sm:w-20 rounded-full bg-gradient-to-r from-[#FF5126] via-[#FFB703] to-[#1A73E8] animate-vibe-shimmer opacity-85" />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#F8F9FA]/95 backdrop-blur-md transition-opacity duration-200">
        {content}
      </div>
    );
  }

  return content;
}
