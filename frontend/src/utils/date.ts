// Parse Vietnamese date string or standard date strings to Date object
export const parseVietnameseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // Handle formats like "ngày 15 tháng 1" or "15/1/2026" or "15-01-2026" or "2026-01-15"

    // Format: "ngày X tháng Y"
    const vnMatch = dateStr.match(/ngày\s*(\d+)\s*tháng\s*(\d+)/i);
    if (vnMatch) {
        const day = parseInt(vnMatch[1]);
        const month = parseInt(vnMatch[2]) - 1; // months are 0-indexed
        const year = new Date().getFullYear();
        return new Date(year, month, day);
    }

    // Format: "YYYY-MM-DD"
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        const year = parseInt(isoMatch[1]);
        const month = parseInt(isoMatch[2]) - 1;
        const day = parseInt(isoMatch[3]);
        return new Date(year, month, day);
    }

    // Format: "DD/MM" or "DD/MM/YYYY"
    const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (slashMatch) {
        const day = parseInt(slashMatch[1]);
        const month = parseInt(slashMatch[2]) - 1;
        let year = slashMatch[3] ? parseInt(slashMatch[3]) : new Date().getFullYear();
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    // Format: "DD-MM-YYYY"
    const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (dashMatch) {
        const day = parseInt(dashMatch[1]);
        const month = parseInt(dashMatch[2]) - 1;
        let year = parseInt(dashMatch[3]);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    // Fallback to standard JS Date parsing
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate;
    }

    return null;
};

// Format any standard string to "ngày X tháng Y" (ignoring the year)
export const formatToVietnameseDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = parseVietnameseDate(dateStr);
    if (!date || isNaN(date.getTime())) return dateStr; // fallback to original if parsing fails

    return `ngày ${date.getDate()} tháng ${date.getMonth() + 1}`;
};
