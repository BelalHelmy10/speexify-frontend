"use client";

import { useEffect, useState } from "react";
import useAuth from "@/hooks/useAuth";

export default function DigitalClock() {
    const { user } = useAuth();
    const [time, setTime] = useState(null);

    useEffect(() => {
        // Initial set
        setTime(new Date());

        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!time) return null; // Hydration mismatch avoidance

    return (
        <div className="spx-digital-clock">
            <span className="spx-clock-time">
                {time.toLocaleTimeString("en-US", {
                    timeZone: user?.timezone || undefined,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                })}
            </span>
        </div>
    );
}
