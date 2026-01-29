export function getSupportedTimezones() {
    if (typeof Intl.supportedValuesOf !== "function") {
        return [
            { value: "UTC", label: "(UTC+00:00) UTC" },
            { value: "Africa/Cairo", label: "(UTC+02:00) Africa/Cairo" },
            { value: "Europe/London", label: "(UTC+00:00) Europe/London" },
            { value: "America/New_York", label: "(UTC-05:00) America/New_York" },
            { value: "Europe/Paris", label: "(UTC+01:00) Europe/Paris" },
            { value: "Asia/Dubai", label: "(UTC+04:00) Asia/Dubai" },
            { value: "Asia/Tokyo", label: "(UTC+09:00) Asia/Tokyo" },
            { value: "Australia/Sydney", label: "(UTC+11:00) Australia/Sydney" },
        ];
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
                offset: cleanOffset // useful for sorting
            };
        } catch (e) {
            return { value: tz, label: tz };
        }
    }).sort((a, b) => {
        // Sort by offset roughly, or alpha?
        // Alpha by label is usually easiest for users if they know their region
        return a.label.localeCompare(b.label);
    });
}
