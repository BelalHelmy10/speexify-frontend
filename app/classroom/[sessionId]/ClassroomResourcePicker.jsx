// app/classroom/[sessionId]/ClassroomResourcePicker.jsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { buildPickerIndex } from "./classroomHelpers";

export default function ClassroomResourcePicker({
  tracks,
  selectedResourceId,
  onChangeResourceId,
  isTeacher,
}) {
  const {
    trackOptions,
    booksByTrackId,
    bookLevelsByBookId,
    unitOptionsByBookLevelId,
    resourcesByUnitId,
  } = useMemo(() => buildPickerIndex(tracks), [tracks]);

  const [trackId, setTrackId] = useState(trackOptions[0]?.value || "");
  const [bookId, setBookId] = useState("");
  const [bookLevelId, setBookLevelId] = useState("");
  const [unitId, setUnitId] = useState("");

  const bookOptions = trackId ? booksByTrackId[trackId] || [] : [];
  const bookLevelOptions = bookId ? bookLevelsByBookId[bookId] || [] : [];
  const unitOptions = bookLevelId
    ? unitOptionsByBookLevelId[bookLevelId] || []
    : [];
  const resourceOptions = unitId ? resourcesByUnitId[unitId] || [] : [];

  // All cascades are TEACHER-ONLY

  useEffect(() => {
    if (!isTeacher) return;
    if (!trackOptions.length) return;

    setTrackId((prev) =>
      trackOptions.some((t) => t.value === prev) ? prev : trackOptions[0].value
    );
  }, [trackOptions, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;

    const list = booksByTrackId[trackId] || [];
    if (!list.length) {
      setBookId("");
      setBookLevelId("");
      setUnitId("");
      onChangeResourceId(null);
      return;
    }

    setBookId((prev) =>
      list.some((b) => b.value === prev) ? prev : list[0].value
    );
  }, [trackId, booksByTrackId, onChangeResourceId, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;

    const list = bookLevelsByBookId[bookId] || [];
    if (!list.length) {
      setBookLevelId("");
      setUnitId("");
      onChangeResourceId(null);
      return;
    }

    setBookLevelId((prev) =>
      list.some((l) => l.value === prev) ? prev : list[0].value
    );
  }, [bookId, bookLevelsByBookId, onChangeResourceId, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;

    const list = unitOptionsByBookLevelId[bookLevelId] || [];
    if (!list.length) {
      setUnitId("");
      onChangeResourceId(null);
      return;
    }

    setUnitId((prev) =>
      list.some((u) => u.value === prev) ? prev : list[0].value
    );
  }, [bookLevelId, unitOptionsByBookLevelId, onChangeResourceId, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;

    const list = resourcesByUnitId[unitId] || [];
    if (!list.length) {
      onChangeResourceId(null);
      return;
    }

    // If current selectedResourceId is still valid, keep it.
    // Otherwise, fall back to the first resource in this unit.
    const stillExists = list.some((r) => r._id === selectedResourceId);
    const nextId = stillExists ? selectedResourceId : list[0]._id;

    if (nextId !== selectedResourceId) {
      onChangeResourceId(nextId);
    }
  }, [
    unitId,
    resourcesByUnitId,
    selectedResourceId,
    onChangeResourceId,
    isTeacher,
  ]);

  return (
    <div className="spx-classroom-picker">
      <div className="spx-classroom-picker__row">
        {/* Track */}
        <div className="spx-classroom-picker__select">
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            disabled={!isTeacher}
          >
            {trackOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Book */}
        <div
          className={
            "spx-classroom-picker__select" +
            (!bookOptions.length ? " spx-classroom-picker__select--empty" : "")
          }
        >
          <select
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            disabled={!bookOptions.length || !isTeacher}
          >
            {!bookOptions.length && <option>No books</option>}
            {bookOptions.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* Book level */}
        <div
          className={
            "spx-classroom-picker__select" +
            (!bookLevelOptions.length
              ? " spx-classroom-picker__select--empty"
              : "")
          }
        >
          <select
            value={bookLevelId}
            onChange={(e) => setBookLevelId(e.target.value)}
            disabled={!bookLevelOptions.length || !isTeacher}
          >
            {!bookLevelOptions.length && <option>No levels</option>}
            {bookLevelOptions.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Unit */}
        <div
          className={
            "spx-classroom-picker__select" +
            (!unitOptions.length ? " spx-classroom-picker__select--empty" : "")
          }
        >
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            disabled={!unitOptions.length || !isTeacher}
          >
            {!unitOptions.length && <option>No units</option>}
            {unitOptions.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {/* Resource */}
        <div
          className={
            "spx-classroom-picker__select" +
            (!resourceOptions.length
              ? " spx-classroom-picker__select--empty"
              : "")
          }
        >
          <select
            value={selectedResourceId || ""}
            onChange={(e) => onChangeResourceId(e.target.value)}
            disabled={!resourceOptions.length || !isTeacher}
          >
            {!resourceOptions.length && <option>No resources</option>}
            {resourceOptions.map((r) => (
              <option key={r._id} value={r._id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
