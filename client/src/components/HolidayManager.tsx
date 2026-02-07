import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Upload
} from "lucide-react";
import { 
  isValidDateFormat, 
  isPastDate, 
  getTodayDate,
  addDaysToDate 
} from "@/lib/availability";
import { type StoreHoliday } from "@shared/schema";

const holidaySchema = z.object({
  holidayDate: z.string().refine((val) => isValidDateFormat(val), {
    message: "Invalid date format. Use YYYY-MM-DD",
  }),
  name: z.string().min(1, "Holiday name is required").max(100),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

interface HolidayManagerProps {
  shopId: string;
  initialHolidays?: StoreHoliday[];
  onHolidaysChange?: () => void;
  isLoading?: boolean;
}

export function HolidayManager({
  shopId,
  initialHolidays = [],
  onHolidaysChange,
  isLoading: externalLoading = false,
}: HolidayManagerProps) {
  const [holidays, setHolidays] = useState<StoreHoliday[]>(initialHolidays);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(externalLoading);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      holidayDate: "",
      name: "",
    },
  });

  useEffect(() => {
    setHolidays(initialHolidays);
  }, [initialHolidays]);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/super-admin/shops/${shopId}/availability`);
      if (!response.ok) throw new Error("Failed to fetch holidays");
      const data = await response.json();
      setHolidays(data.holidays || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: HolidayFormData) => {
    setError(null);
    setAddSuccess(false);
    
    try {
      const response = await fetch(`/api/super-admin/shops/${shopId}/holidays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add holiday");
      }

      const newHoliday = await response.json();
      setHolidays((prev) => [...prev, newHoliday].sort(
        (a, b) => a.holidayDate.localeCompare(b.holidayDate)
      ));
      setAddSuccess(true);
      reset();
      setTimeout(() => setAddSuccess(false), 3000);
      onHolidaysChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const deleteHoliday = async (holidayId: string) => {
    setIsDeleting(holidayId);
    try {
      const response = await fetch(`/api/super-admin/holidays/${holidayId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete holiday");
      }

      setHolidays((prev) => prev.filter((h) => h.id !== holidayId));
      onHolidaysChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (dateStr: string) => {
    return dateStr === getTodayDate();
  };

  const isFutureDate = (dateStr: string) => {
    return dateStr > getTodayDate();
  };

  // Group holidays by year
  const groupedHolidays = holidays.reduce((acc, holiday) => {
    const year = holiday.holidayDate.split("-")[0];
    if (!acc[year]) acc[year] = [];
    acc[year].push(holiday);
    return acc;
  }, {} as Record<string, StoreHoliday[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-4">
        <Calendar className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Holiday Management</h2>
        <button
          onClick={fetchHolidays}
          className="ml-auto rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          title="Refresh holidays"
        >
          <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Add Holiday Form */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-900">Add Holiday</h3>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                {...register("holidayDate")}
                min={getTodayDate()}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2
                           focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.holidayDate && (
                <p className="mt-1 text-sm text-red-600">{errors.holidayDate.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Holiday Name
              </label>
              <input
                type="text"
                {...register("name")}
                placeholder="e.g., Republic Day, Diwali, Christmas..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2
                           focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {addSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Holiday added successfully!</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2
                         text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Holiday
            </button>
          </div>
        </form>
      </div>

      {/* Holidays List */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">
          Scheduled Holidays ({holidays.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No holidays scheduled</p>
            <p className="text-xs text-gray-400">
              Add holidays above to mark days when the store will be closed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedHolidays)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([year, yearHolidays]) => (
                <div key={year} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {year}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {yearHolidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className={`
                          flex items-center justify-between rounded-lg border p-3
                          ${isToday(holiday.holidayDate)
                            ? "border-purple-300 bg-purple-50"
                            : "border-gray-200 bg-white"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            flex h-8 w-8 items-center justify-center rounded-full
                            ${isToday(holiday.holidayDate)
                              ? "bg-purple-200 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                            }
                          `}>
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{holiday.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(holiday.holidayDate)}
                              {isToday(holiday.holidayDate) && (
                                <span className="ml-2 text-purple-600 font-medium">
                                  (Today)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteHoliday(holiday.id)}
                          disabled={isDeleting === holiday.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600
                                     disabled:opacity-50"
                        >
                          {isDeleting === holiday.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Bulk Add Tips */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-900">Quick Tips</h4>
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            Add holidays in advance so customers know when you'll be closed
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            Store will automatically show "Closed" on holiday dates
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            You can still manually override store status using the Force options
          </li>
        </ul>
      </div>
    </div>
  );
}

// Hook for managing store holidays
export function useStoreHolidays(shopId: string) {
  const [holidays, setHolidays] = useState<StoreHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/super-admin/shops/${shopId}/availability`);
      if (!response.ok) throw new Error("Failed to fetch holidays");
      const data = await response.json();
      setHolidays(data.holidays || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const addHoliday = async (holidayDate: string, name: string) => {
    const response = await fetch(`/api/super-admin/shops/${shopId}/holidays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holidayDate, name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add holiday");
    }
    const newHoliday = await response.json();
    setHolidays((prev) => [...prev, newHoliday]);
    return newHoliday;
  };

  const deleteHoliday = async (holidayId: string) => {
    const response = await fetch(`/api/super-admin/holidays/${holidayId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete holiday");
    }
    setHolidays((prev) => prev.filter((h) => h.id !== holidayId));
  };

  return {
    holidays,
    isLoading,
    error,
    fetchHolidays,
    addHoliday,
    deleteHoliday,
    refresh: fetchHolidays,
  };
}
