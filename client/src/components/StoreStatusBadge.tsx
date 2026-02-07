import React from "react";
import { type StoreStatusResponse, type StoreAvailabilityStatus } from "@shared/schema";
import { getStatusBadgeStyles, getNextOpenTime, formatTime12Hour } from "@/lib/availability";

interface StoreStatusBadgeProps {
  status: StoreStatusResponse;
  size?: "sm" | "md" | "lg";
  showHours?: boolean;
  className?: string;
}

export function StoreStatusBadge({
  status,
  size = "md",
  showHours = true,
  className = "",
}: StoreStatusBadgeProps) {
  const styles = getStatusBadgeStyles(status.status);
  const nextOpenTime = getNextOpenTime(status);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${styles.bg} ${styles.text} ${styles.border}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className={iconSizes[size]}>{styles.icon}</span>
      <span>{status.message}</span>
      
      {showHours && status.status === "opens_later" && nextOpenTime && (
        <span className="opacity-75">
          ({nextOpenTime})
        </span>
      )}
      
      {showHours && status.status === "open" && (
        <span className="opacity-75">
          ({formatTime12Hour(status.openingTime)} - {formatTime12Hour(status.closingTime)})
        </span>
      )}
    </div>
  );
}

interface StoreHoursDisplayProps {
  openingTime: string;
  closingTime: string;
  timezone: string;
  className?: string;
}

export function StoreHoursDisplay({
  openingTime,
  closingTime,
  timezone,
  className = "",
}: StoreHoursDisplayProps) {
  return (
    <div className={`text-sm text-gray-600 ${className}`}>
      <span className="font-medium">Hours: </span>
      <span>
        {formatTime12Hour(openingTime)} - {formatTime12Hour(closingTime)}
      </span>
      <span className="ml-1 text-xs text-gray-400">
        ({timezone})
      </span>
    </div>
  );
}

interface StoreAvailabilityCardProps {
  shopName: string;
  status: StoreStatusResponse;
  onBrowseMenu?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function StoreAvailabilityCard({
  shopName,
  status,
  onBrowseMenu,
  onViewDetails,
  className = "",
}: StoreAvailabilityCardProps) {
  const styles = getStatusBadgeStyles(status.status);
  const isOpen = status.isOpen;

  return (
    <div
      className={`
        rounded-lg border p-4 transition-all
        ${isOpen 
          ? "border-green-200 bg-green-50" 
          : "border-gray-200 bg-gray-50"
        }
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StoreStatusBadge status={status} size="md" showHours={true} />
        </div>
        
        {isOpen && onBrowseMenu && (
          <button
            onClick={onBrowseMenu}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white
                       hover:bg-green-700 transition-colors"
          >
            Browse Menu
          </button>
        )}
        
        {!isOpen && onViewDetails && (
          <button
            onClick={onViewDetails}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Details
          </button>
        )}
      </div>
      
      {!isOpen && (
        <p className="mt-2 text-sm text-gray-600">
          {status.status === "holiday" 
            ? `We're closed for ${status.holidayName}. Browse our menu for later!`
            : status.status === "opens_later"
            ? `We'll open at ${getNextOpenTime(status)}. Check back soon!`
            : "We're currently closed. Browse our menu and place an order when we reopen!"}
        </p>
      )}
    </div>
  );
}

// Simple badge component for lists/cards
interface SimpleStoreStatusProps {
  status: StoreStatusResponse;
  compact?: boolean;
}

export function SimpleStoreStatus({ status, compact = false }: SimpleStoreStatusProps) {
  const styles = getStatusBadgeStyles(status.status);
  
  if (compact) {
    return (
      <span
        className={`
          inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium
          ${styles.bg} ${styles.text} ${styles.border}
        `}
      >
        <span>{styles.icon}</span>
        <span>{status.status === "opens_later" ? `Opens ${getNextOpenTime(status)}` : status.message}</span>
      </span>
    );
  }
  
  return (
    <StoreStatusBadge 
      status={status} 
      size="sm" 
      showHours={status.status === "open"} 
    />
  );
}
