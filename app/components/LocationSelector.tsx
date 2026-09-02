"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Check, X, RotateCcw, AlertCircle } from "lucide-react";
import { useLocation, setLocation, resetLocation } from "@/lib/location";
import { validatePincode } from "@/lib/location/validation";

interface LocationSelectorProps {
  className?: string;
  isMobileDrawer?: boolean;
  onLocationChange?: () => void;
}

export default function LocationSelector({
  className = "",
  isMobileDrawer = false,
  onLocationChange,
}: LocationSelectorProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setErrorMessage(null);
        setSuccessMessage(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus input on open
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setErrorMessage(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleApplyPincode = (pincodeToApply?: string) => {
    const raw = pincodeToApply || pincodeInput;
    const validation = validatePincode(raw);

    if (!validation.isValid) {
      setErrorMessage(validation.error || "Invalid PIN code. Must be 6 digits.");
      setSuccessMessage(null);
      return;
    }

    const updated = setLocation({
      pincode: validation.pincode,
      city: validation.city,
      state: validation.state,
    });

    setErrorMessage(null);
    setSuccessMessage(`Location updated to ${updated.label}`);
    setPincodeInput("");

    if (onLocationChange) {
      onLocationChange();
    }

    setTimeout(() => {
      setIsOpen(false);
      setSuccessMessage(null);
    }, 800);
  };

  const handleReset = () => {
    resetLocation();
    setPincodeInput("");
    setErrorMessage(null);
    setSuccessMessage("Reset to default Mumbai fallback");

    if (onLocationChange) {
      onLocationChange();
    }

    setTimeout(() => {
      setIsOpen(false);
      setSuccessMessage(null);
    }, 800);
  };

  const popularPincodes = [
    { label: "Mumbai", pincode: "400001" },
    { label: "Delhi", pincode: "110001" },
    { label: "Bengaluru", pincode: "560001" },
    { label: "Pune", pincode: "411001" },
  ];

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          !location.isFallback ? "border-blue-200 bg-blue-50/50 text-blue-900" : ""
        } ${isMobileDrawer ? "w-full justify-between py-3 text-sm" : ""}`}
        title={location.isFallback ? "Default fallback location: Mumbai" : `Selected location: ${location.label}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <MapPin size={15} className={location.isFallback ? "text-gray-500" : "text-blue-600"} />
          <span className="truncate max-w-[140px] sm:max-w-[170px]">
            {location.label}
          </span>
          {location.isFallback && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-gray-500">
              Default
            </span>
          )}
        </div>
      </button>

      {/* Location Dropdown Modal / Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Location selector dialog"
          className={`absolute z-50 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl transition-all ${
            isMobileDrawer
              ? "left-0 right-0 w-full"
              : "right-0 md:right-auto md:left-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Delivery Location</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close location selector"
            >
              <X size={16} />
            </button>
          </div>

          {/* Current Status */}
          <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-900">
              Active: <span className="text-blue-700">{location.label}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {location.isFallback
                ? "Prices currently based on Mumbai fallback coordinates."
                : "Live QuickCommerce prices will be calculated for this area."}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleApplyPincode();
            }}
            className="mt-4 space-y-3"
          >
            <div>
              <label htmlFor="pincode-input" className="block text-xs font-bold text-gray-700">
                Enter Indian PIN Code
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  ref={inputRef}
                  id="pincode-input"
                  type="text"
                  maxLength={6}
                  value={pincodeInput}
                  onChange={(e) => {
                    setPincodeInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. 400001, 110001"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Validation Error / Success Messages */}
            {errorMessage && (
              <div className="flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-1.5 rounded-lg bg-green-50 p-2 text-xs text-green-700">
                <Check size={14} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Quick Popular Pincodes */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-gray-500">Popular Cities:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {popularPincodes.map((item) => (
                  <button
                    key={item.pincode}
                    type="button"
                    onClick={() => handleApplyPincode(item.pincode)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                  >
                    {item.label} ({item.pincode})
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Option if custom */}
            {!location.isFallback && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  <RotateCcw size={13} />
                  <span>Reset to Default (Mumbai)</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
