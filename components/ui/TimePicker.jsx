// components/ui/TimePicker.jsx
"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Custom time picker dropdown that doesn't use native select
 * to avoid macOS full-screen picker behavior
 */
export default function TimePicker({
    value,
    onChange,
    name,
    className = "",
    required = false,
    placeholder = "Select time...",
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Generate time options (full 24 hours in 15-min intervals)
    const timeOptions = [];
    for (let i = 0; i < 96; i++) {
        const hour = Math.floor(i / 4);
        const minute = (i % 4) * 15;
        const val = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour >= 12 ? "PM" : "AM";
        const label = `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
        timeOptions.push({ value: val, label });
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Find display label for current value
    const selectedOption = timeOptions.find((t) => t.value === value);
    const displayValue = selectedOption?.label || placeholder;

    const handleSelect = (val) => {
        onChange({ target: { name, value: val } });
        setIsOpen(false);
    };

    return (
        <div className={`time-picker ${className}`} ref={containerRef}>
            <button
                type="button"
                className={`time-picker__trigger ${isOpen ? "time-picker__trigger--open" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={!value ? "time-picker__placeholder" : ""}>
                    {displayValue}
                </span>
                <svg
                    className="time-picker__arrow"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                >
                    <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="time-picker__dropdown"
                    role="listbox"
                    data-lenis-prevent
                >
                    {timeOptions.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            className={`time-picker__option ${t.value === value ? "time-picker__option--selected" : ""}`}
                            onClick={() => handleSelect(t.value)}
                            role="option"
                            aria-selected={t.value === value}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={value || ""} required={required} />
        </div>
    );
}
