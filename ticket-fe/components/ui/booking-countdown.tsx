"use client";

import React from "react";
import { Clock } from "lucide-react";

interface BookingCountdownProps {
  /** Thời gian còn lại đã format (MM:SS) */
  formattedTime: string;
  /** Session đang active không */
  isActive: boolean;
  /** Dưới 1 phút (urgent) */
  isUrgent: boolean;
  /** Dưới 3 phút (warning) */
  isWarning: boolean;
}

/**
 * Component hiển thị countdown timer cho booking session
 */
export function BookingCountdown({
  formattedTime,
  isActive,
  isUrgent,
  isWarning,
}: BookingCountdownProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
      ${
        isUrgent
          ? "bg-red-100 text-red-700 animate-pulse"
          : isWarning
          ? "bg-orange-100 text-orange-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>Còn {formattedTime}</span>
    </div>
  );
}

export default BookingCountdown;
