import { Settings } from '@/lib/types';
import { isBefore, setHours, setMinutes, setSeconds, previousSaturday, nextMonday, startOfDay, addDays, getDay } from 'date-fns';

/**
 * Parse a time string like "12:00:00" into hours/minutes/seconds.
 */
function parseTime(timeStr: string): { hours: number; minutes: number; seconds: number } {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return { hours, minutes: minutes || 0, seconds: seconds || 0 };
}

/**
 * Set time components on a date.
 */
function setTime(date: Date, timeStr: string): Date {
    const { hours, minutes, seconds } = parseTime(timeStr);
    return setSeconds(setMinutes(setHours(date, hours), minutes), seconds);
}

/**
 * Get the most recent day of the week before or on the given date.
 * dayOfWeek: 0 = Sunday, 6 = Saturday
 */
function getMostRecentDay(from: Date, dayOfWeek: number): Date {
    const current = getDay(from);
    const diff = (current - dayOfWeek + 7) % 7;
    return startOfDay(addDays(from, -diff));
}

/**
 * Check if a weekly order can still be submitted for the given week_start_date (Monday).
 * Cutoff: weekly_cutoff_day at weekly_cutoff_time of the week BEFORE the week_start_date.
 * 
 * Example: If submitting for the week starting Monday Feb 2, cutoff is Saturday Jan 31 at 12:00 PM.
 */
export function canSubmitWeeklyOrder(
    weekStartDate: Date,
    settings: Settings,
    now: Date = new Date()
): { allowed: boolean; cutoffDate: Date; message: string } {
    // The cutoff day is in the week before the selected Monday.
    // E.g., if weekly_cutoff_day = 6 (Saturday), cutoff is the Saturday before the Monday.
    const cutoffBase = addDays(weekStartDate, -(7 - settings.weekly_cutoff_day));
    const cutoffDate = setTime(cutoffBase, settings.weekly_cutoff_time);

    const allowed = isBefore(now, cutoffDate);

    return {
        allowed,
        cutoffDate,
        message: allowed
            ? `Order must be submitted before ${cutoffDate.toLocaleString()}`
            : `Order deadline has passed (was ${cutoffDate.toLocaleString()})`,
    };
}

/**
 * Check if a daily order can still be submitted for the given delivery_date.
 * Uses the same cutoff logic — the Saturday before the week of the delivery date.
 */
export function canSubmitDailyOrder(
    deliveryDate: Date,
    settings: Settings,
    now: Date = new Date()
): { allowed: boolean; cutoffDate: Date; message: string } {
    // Find the Monday of the delivery date's week
    const dayOfWeek = getDay(deliveryDate);
    const mondayOfWeek = dayOfWeek === 1
        ? startOfDay(deliveryDate)
        : dayOfWeek === 0
            ? startOfDay(addDays(deliveryDate, -6))
            : startOfDay(addDays(deliveryDate, -(dayOfWeek - 1)));

    // The cutoff is relative to the Monday of that week
    const cutoffBase = addDays(mondayOfWeek, -(7 - settings.weekly_cutoff_day));
    const cutoffDate = setTime(cutoffBase, settings.daily_cutoff_time);

    const allowed = isBefore(now, cutoffDate);

    return {
        allowed,
        cutoffDate,
        message: allowed
            ? `Order must be submitted before ${cutoffDate.toLocaleString()}`
            : `Order deadline has passed (was ${cutoffDate.toLocaleString()})`,
    };
}

/**
 * Get the next available Monday for weekly order submission.
 */
export function getNextAvailableMonday(
    settings: Settings,
    now: Date = new Date()
): Date {
    // Start with next Monday from today
    let candidate = nextMonday(now);

    // Check if we can still submit for this Monday
    const check = canSubmitWeeklyOrder(candidate, settings, now);
    if (check.allowed) {
        return candidate;
    }

    // Otherwise, try the Monday after
    return addDays(candidate, 7);
}

/**
 * Get all available upcoming Mondays (next 4 weeks).
 */
export function getAvailableMondays(
    settings: Settings,
    now: Date = new Date()
): Date[] {
    const mondays: Date[] = [];
    let candidate = nextMonday(now);

    for (let i = 0; i < 4; i++) {
        const check = canSubmitWeeklyOrder(candidate, settings, now);
        if (check.allowed) {
            mondays.push(candidate);
        }
        candidate = addDays(candidate, 7);
    }

    return mondays;
}
