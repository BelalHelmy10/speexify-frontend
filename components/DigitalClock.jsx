"use client";

import { useEffect, useState, useMemo } from "react";
import useAuth from "@/hooks/useAuth";

function FlipDigit({ value }) {
  const [display, setDisplay] = useState(value);
  const [flipTo, setFlipTo] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value === display) return;
    setFlipTo(value);
    setIsFlipping(true);
    const t = setTimeout(() => {
      setDisplay(value);
      setIsFlipping(false);
    }, 550);
    return () => clearTimeout(t);
  }, [value, display]);

  return (
    <div className={`spx-flip-digit ${isFlipping ? "is-flipping" : ""}`}>
      <div className="spx-flip-static spx-flip-static-top"><span>{display}</span></div>
      <div className="spx-flip-static spx-flip-static-bottom"><span>{isFlipping ? flipTo : display}</span></div>

      <div className="spx-flip-card spx-flip-card-top">
        <span>{display}</span>
      </div>
      <div className="spx-flip-card spx-flip-card-bottom">
        <span>{flipTo}</span>
      </div>
    </div>
  );
}

function FlipPair({ value }) {
  const a = value.charAt(0);
  const b = value.charAt(1);
  return (
    <span className="spx-flip-pair">
      <FlipDigit value={a} />
      <FlipDigit value={b} />
    </span>
  );
}

export default function DigitalClock() {
  const { user } = useAuth();
  const [time, setTime] = useState(null);
  const [tick, setTick] = useState(true);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
      setTick((v) => !v);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const parts = useMemo(() => {
    if (!time) return null;
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: user?.timezone || undefined,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(time);
    const get = (t) => p.find((x) => x.type === t)?.value || "";
    return {
      hour: get("hour"),
      minute: get("minute"),
    };
  }, [time, user?.timezone]);

  if (!time || !parts) return null;

  const dateStr = time.toLocaleDateString("en-US", {
    timeZone: user?.timezone || undefined,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="spx-digital-clock" title={dateStr} dir="ltr">
      <span
        className="spx-clock-time"
        aria-label={time.toLocaleTimeString("en-US", {
          timeZone: user?.timezone || undefined,
          hour12: true,
        })}
      >
        <FlipPair value={parts.hour} />
        <span className={`spx-clock-colon ${tick ? "is-on" : ""}`}>:</span>
        <FlipPair value={parts.minute} />
      </span>
    </div>
  );
}
