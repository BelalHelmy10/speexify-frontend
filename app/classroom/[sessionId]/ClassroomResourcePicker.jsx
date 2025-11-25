// app/classroom/[sessionId]/ClassroomResourcePicker.jsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { buildPickerIndex } from "./classroomHelpers";

export default function ClassroomResourcePicker({
  tracks,
  selectedResourceId,
  onChangeResourceId,
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

  // cascade selection: track → book → level → unit → resource
  useEffect(() => {
    if (!trackOptions.length) return;
    setTrackId((prev) =>
      trackOptions.some((t) => t.value === prev) ? prev : trackOptions[0].value
    );
  }, [trackOptions]);

  useEffect(() => {
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
  }, [trackId, booksByTrackId, onChangeResourceId]);

  useEffect(() => {
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
  }, [bookId, bookLevelsByBookId, onChangeResourceId]);

  useEffect(() => {
    const list = unitOptionsByBookLevelId[bookLevelId] || [];
    if (!list.length) {
      setUnitId("");
      onChangeResourceId(null);
      return;
    }
    setUnitId((prev) =>
      list.some((u) => u.value === prev) ? prev : list[0].value
    );
  }, [bookLevelId, unitOptionsByBookLevelId, onChangeResourceId]);

  useEffect(() => {
    const list = resourcesByUnitId[unitId] || [];
    if (!list.length) {
      onChangeResourceId(null);
      return;
    }
    onChangeResourceId((prev) =>
      list.some((r) => r._id === prev) ? prev : list[0]._id
    );
  }, [unitId, resourcesByUnitId, onChangeResourceId]);

  return (
    <div className="classroom-picker">
      <div className="classroom-picker__row">
        <select
          className="classroom-picker__select"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
        >
          {trackOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          className="classroom-picker__select"
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          disabled={!bookOptions.length}
        >
          {!bookOptions.length && <option>No books</option>}
          {bookOptions.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>

        <select
          className="classroom-picker__select"
          value={bookLevelId}
          onChange={(e) => setBookLevelId(e.target.value)}
          disabled={!bookLevelOptions.length}
        >
          {!bookLevelOptions.length && <option>No levels</option>}
          {bookLevelOptions.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <select
          className="classroom-picker__select"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          disabled={!unitOptions.length}
        >
          {!unitOptions.length && <option>No units</option>}
          {unitOptions.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>

        <select
          className="classroom-picker__select classroom-picker__select--resource"
          value={selectedResourceId || ""}
          onChange={(e) => onChangeResourceId(e.target.value)}
          disabled={!resourceOptions.length}
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
  );
}
