const DEFAULT_TIMEZONES = [
    { value: "UTC", label: "(UTC+00:00) UTC" },
    { value: "Africa/Cairo", label: "(UTC+02:00) Africa/Cairo" },
    { value: "Europe/London", label: "(UTC+00:00) Europe/London" },
    { value: "Europe/Paris", label: "(UTC+01:00) Europe/Paris" },
    { value: "Asia/Dubai", label: "(UTC+04:00) Asia/Dubai" },
    { value: "Asia/Riyadh", label: "(UTC+03:00) Asia/Riyadh" },
    { value: "Asia/Tokyo", label: "(UTC+09:00) Asia/Tokyo" },
    { value: "Australia/Sydney", label: "(UTC+11:00) Australia/Sydney" },
    { value: "America/New_York", label: "(UTC-05:00) America/New York" },
    { value: "America/Los_Angeles", label: "(UTC-08:00) America/Los Angeles" },
];

export function getDefaultTimezones() {
    return DEFAULT_TIMEZONES;
}

export function getSupportedTimezones() {
    if (typeof Intl.supportedValuesOf !== "function") {
        return DEFAULT_TIMEZONES;
    }

    const timezones = Intl.supportedValuesOf("timeZone");

    return timezones.map((tz) => {
        try {
            const offset = new Intl.DateTimeFormat("en-US", {
                timeZone: tz,
                timeZoneName: "longOffset",
            })
                .formatToParts(new Date())
                .find((part) => part.type === "timeZoneName")?.value;

            // offset looks like "GMT-08:00" or "GMT+03:00"
            // Let's make it cleaner: (UTC-08:00) America/Los_Angeles
            const cleanOffset = offset ? offset.replace("GMT", "UTC") : "UTC";

            return {
                value: tz,
                label: `(${cleanOffset}) ${tz.replace(/_/g, " ")}`,
                offset: cleanOffset
            };
        } catch (e) {
            return { value: tz, label: tz };
        }
    }).sort((a, b) => a.value.localeCompare(b.value));
}
