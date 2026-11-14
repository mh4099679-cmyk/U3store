"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  id: string;
  name_en: string;
  name_ar: string;
  disabled?: boolean;
  extra?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string, selectedOption?: SelectOption) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  lang?: "en" | "ar";
  label?: string;
  className?: string;
  emptyMessage?: string;
  id?: string;
}

/**
 * Normalizes Arabic text for flexible search (hamzas, ta marbuta, alif maqsura, tashkeel)
 */
function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel diacritics
    .replace(/[أإآءئؤ]/g, "ا") // normalize all hamzas to bare alif
    .replace(/ة/g, "ه") // ta marbuta to ha
    .replace(/ى/g, "ي") // alif maqsura to ya
    .toLowerCase()
    .trim();
}

/**
 * Normalizes Latin text for search
 */
function normalizeLatin(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  required = false,
  lang = "en",
  label,
  className = "",
  emptyMessage,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value);
  }, [options, value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter options based on query (Arabic and English normalized)
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return options;

    const normQAr = normalizeArabic(q);
    const normQLat = normalizeLatin(q);

    return options.filter((opt) => {
      const en = normalizeLatin(opt.name_en || "");
      const ar = normalizeArabic(opt.name_ar || "");

      return (
        en.includes(normQLat) ||
        ar.includes(normQAr) ||
        en.includes(normQAr) ||
        ar.includes(normQLat)
      );
    });
  }, [options, searchQuery]);

  const defaultEmptyMsg =
    lang === "ar" ? "لا توجد نتائج مطابقة للبحث" : "No results found matching your search";

  const displaySelectedText = selectedOption
    ? lang === "ar"
      ? `${selectedOption.name_ar} (${selectedOption.name_en})`
      : `${selectedOption.name_en} (${selectedOption.name_ar})`
    : "";

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-full min-w-0 box-border text-start ${className}`}
    >
      {/* Hidden input to ensure native form validation if required */}
      <input
        type="text"
        id={id}
        name={id}
        value={value}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Main Select Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full max-w-full min-w-0 box-border flex items-center justify-between gap-2 border px-3 py-2.5 text-xs rounded-xl outline-none transition-all text-start ${
          disabled
            ? "bg-[#F3F4F6] border-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed opacity-60"
            : isOpen
            ? "bg-white border-black ring-1 ring-black text-jet shadow-sm"
            : "bg-[#FAFBFB] border-[#D5D7DA] text-jet hover:border-[#9CA3AF] hover:bg-white"
        }`}
      >
        <span
          className={`truncate block flex-1 text-xs ${
            !selectedOption ? "text-[#8E9298] font-normal" : "text-jet font-medium"
          }`}
        >
          {selectedOption ? displaySelectedText : placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0 text-[#73777D]">
          {selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 hover:bg-neutral-200 rounded-full transition-colors text-neutral-500 hover:text-black cursor-pointer"
              title={lang === "ar" ? "إلغاء الاختيار" : "Clear selection"}
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-black" : "text-[#73777D]"
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && !disabled && (
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="absolute z-50 mt-1 w-full max-w-full min-w-[240px] bg-white border border-[#D5D7DA] rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ maxHeight: "320px" }}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-[#E5E7EB] bg-[#FAFBFB] sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search
                className={`w-3.5 h-3.5 text-neutral-400 absolute ${
                  lang === "ar" ? "right-2.5" : "left-2.5"
                }`}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "ar" ? "ابحث بالاسم (عربي / English)..." : "Search (English / عربي)..."}
                className={`w-full py-1.5 text-xs bg-white border border-[#D5D7DA] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black placeholder:text-neutral-400 ${
                  lang === "ar" ? "pr-8 pl-7" : "pl-8 pr-7"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={`absolute ${
                    lang === "ar" ? "left-2" : "right-2"
                  } p-0.5 text-neutral-400 hover:text-black`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            role="listbox"
            className="max-h-[240px] overflow-y-auto divide-y divide-[#F3F4F6] overscroll-contain py-1"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-neutral-500 font-medium">
                {emptyMessage || defaultEmptyMsg}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.id, opt);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between text-start transition-colors ${
                      isSelected
                        ? "bg-neutral-100 font-bold text-black"
                        : opt.disabled
                        ? "text-neutral-400 bg-neutral-50 cursor-not-allowed"
                        : "text-jet hover:bg-[#FAFBFB] hover:text-black font-normal"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pe-2">
                      <div className="truncate">
                        <span className="font-semibold text-black">
                          {lang === "ar" ? opt.name_ar : opt.name_en}
                        </span>
                        <span className="ms-1.5 text-[11px] text-neutral-500">
                          ({lang === "ar" ? opt.name_en : opt.name_ar})
                        </span>
                      </div>
                      {opt.extra && (
                        <div className="text-[10px] text-neutral-400 truncate">{opt.extra}</div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ms-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

