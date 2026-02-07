import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Clock, 
  Globe, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RotateCcw
} from "lucide-react";
import { 
  MANUAL_OVERRIDE_OPTIONS, 
  TIMEZONES,
  isValidTimeFormat 
} from "@/lib/availability";
import { 
  type StoreAvailability, 
  type ManualOverride,
  type StoreHoliday 
} from "@shared/schema";

const availabilitySchema = z.object({
  openingTime: z.string().refine((val) => isValidTimeFormat(val), {
    message: "Invalid time format. Use HH:MM (e.g., 09:00)",
  }),
  closingTime: z.string().refine((val) => isValidTimeFormat(val), {
    message: "Invalid time format. Use HH:MM (e.g., 22:00)",
  }),
  timezone: z.string().min(1, "Timezone is required"),
  manualOverride: z.enum(["none", "force_open", "force_close"]),
  overrideReason: z.string().optional(),
});

type AvailabilityFormData = z.infer<typeof availabilitySchema>;

interface StoreAvailabilitySettingsProps {
  shopId: string;
  initialAvailability?: StoreAvailability | null;
  onSave: (data: AvailabilityFormData) => Promise<void>;
  isLoading?: boolean;
}

export function StoreAvailabilitySettings({
  shopId,
  initialAvailability,
  onSave,
  isLoading = false,
}: StoreAvailabilitySettingsProps) {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      openingTime: initialAvailability?.openingTime || "09:00",
      closingTime: initialAvailability?.closingTime || "22:00",
      timezone: initialAvailability?.timezone || "Asia/Kolkata",
      manualOverride: (initialAvailability?.manualOverride as ManualOverride) || "none",
      overrideReason: initialAvailability?.overrideReason || "",
    },
  });

  const manualOverride = watch("manualOverride");

  useEffect(() => {
    if (initialAvailability) {
      reset({
        openingTime: initialAvailability.openingTime || "09:00",
        closingTime: initialAvailability.closingTime || "22:00",
        timezone: initialAvailability.timezone || "Asia/Kolkata",
        manualOverride: (initialAvailability.manualOverride as ManualOverride) || "none",
        overrideReason: initialAvailability.overrideReason || "",
      });
    }
  }, [initialAvailability, reset]);

  const onSubmit = async (data: AvailabilityFormData) => {
    setSaveSuccess(false);
    try {
      await onSave(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving availability:", error);
    }
  };

  const selectedOverride = MANUAL_OVERRIDE_OPTIONS.find(
    (opt) => opt.value === manualOverride
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-4">
        <Clock className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Store Availability</h2>
      </div>

      {/* Save Success Message */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Availability settings saved successfully!</span>
        </div>
      )}

      {/* Operating Hours */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Operating Hours</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Opening Time
            </label>
            <input
              type="time"
              {...register("openingTime")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2
                         focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.openingTime && (
              <p className="mt-1 text-sm text-red-600">{errors.openingTime.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Closing Time
            </label>
            <input
              type="time"
              {...register("closingTime")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2
                         focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.closingTime && (
              <p className="mt-1 text-sm text-red-600">{errors.closingTime.message}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Store will be open between these hours on regular days.
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Timezone</h3>
        </div>
        
        <select
          {...register("timezone")}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2
                     focus:border-blue-500 focus:ring-blue-500"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Manual Override */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Manual Override</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {MANUAL_OVERRIDE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`
                relative flex cursor-pointer flex-col rounded-lg border p-4
                transition-all
                ${manualOverride === option.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
                }
              `}
            >
              <input
                type="radio"
                {...register("manualOverride")}
                value={option.value}
                className="sr-only"
              />
              <div className="flex items-center gap-2">
                {option.value === "none" && <RotateCcw className="h-4 w-4" />}
                {option.value === "force_open" && <CheckCircle className="h-4 w-4 text-green-600" />}
                {option.value === "force_close" && <XCircle className="h-4 w-4 text-red-600" />}
                <span className="font-medium text-gray-900">{option.label}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{option.description}</p>
              
              {manualOverride === option.value && (
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blue-500" />
              )}
            </label>
          ))}
        </div>

        {/* Override Reason */}
        {(manualOverride === "force_open" || manualOverride === "force_close") && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Reason for Override (optional)
            </label>
            <textarea
              {...register("overrideReason")}
              rows={2}
              placeholder="e.g., Special event, maintenance, power outage..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2
                         focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Current Status Indicator */}
        {selectedOverride && selectedOverride.value !== "none" && (
          <div className={`
            rounded-lg p-3
            ${selectedOverride.value === "force_open" 
              ? "bg-blue-50 text-blue-700" 
              : "bg-red-50 text-red-700"
            }
          `}>
            <div className="flex items-center gap-2">
              {selectedOverride.value === "force_open" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                Store is {selectedOverride.value === "force_open" ? "FORCED OPEN" : "FORCED CLOSED"}
              </span>
            </div>
            <p className="mt-1 text-xs opacity-75">
              {selectedOverride.value === "force_open"
                ? "Store will appear open to customers regardless of operating hours or holidays"
                : "Store will appear closed to customers regardless of operating hours or holidays"}
            </p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : "Save Availability Settings"}
        </button>
      </div>
    </form>
  );
}

// Hook for managing store availability
export function useStoreAvailability(shopId: string) {
  const [availability, setAvailability] = useState<StoreAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/super-admin/shops/${shopId}/availability`);
      if (!response.ok) throw new Error("Failed to fetch availability");
      const data = await response.json();
      setAvailability(data.availability || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvailability = async (data: AvailabilityFormData) => {
    const response = await fetch(`/api/super-admin/shops/${shopId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update availability");
    }
    const updated = await response.json();
    setAvailability(updated);
    return updated;
  };

  return {
    availability,
    isLoading,
    error,
    fetchAvailability,
    updateAvailability,
    refresh: fetchAvailability,
  };
}
