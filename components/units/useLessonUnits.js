"use client";

// Loads a learner's lessons and groups them into curriculum units. With a
// learnerId it loads that learner's lessons for their teacher.
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { lookupUnits } from "@/lib/curriculumLookup";
import { groupLessonsIntoUnits, materialIds } from "@/lib/lessonUnits.mjs";

export default function useLessonUnits({ learnerId = null, enabled = true } = {}) {
  const [state, setState] = useState({ status: "loading", groups: null, learner: null, lessons: [] });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const path = learnerId ? `/learners/${encodeURIComponent(learnerId)}/lesson-history` : "/me/lesson-history";
      const res = await api.get(path);
      const lessons = Array.isArray(res.data?.lessons) ? res.data.lessons : [];
      const ids = materialIds(lessons);
      const lookup = ids.length ? await lookupUnits(ids) : { resources: {}, units: {} };
      setState({
        status: "ready",
        groups: groupLessonsIntoUnits(lessons, lookup),
        learner: res.data?.learner || null,
        lessons,
      });
    } catch {
      setState({ status: "error", groups: null, learner: null, lessons: [] });
    }
  }, [learnerId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { ...state, reload: load };
}
