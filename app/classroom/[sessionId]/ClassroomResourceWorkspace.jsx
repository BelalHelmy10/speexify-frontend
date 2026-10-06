"use client";

import { useEffect, useId, useRef } from "react";
import { BookOpen, Plus, X } from "lucide-react";

// Keep each resource mounted: annotations, undo history, page and zoom belong
// to that resource, rather than to whichever tab happens to be selected.
export default function ClassroomResourceWorkspace({
  resources, selectedResourceId, onSelect, onClose, onOpenPicker,
  canManage = false, locale = "en", renderResource, emptyContent,
  suspended = false, scrollContainerRef,
}) {
  const id = useId();
  const tabRefs = useRef(new Map());
  const ar = locale === "ar";
  useEffect(() => {
    tabRefs.current.get(selectedResourceId)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [selectedResourceId]);

  function closeResource(resourceId) {
    const index = resources.findIndex((resource) => resource._id === resourceId);
    const remaining = resources.filter((resource) => resource._id !== resourceId);
    const focusId = selectedResourceId === resourceId
      ? remaining[Math.min(index, remaining.length - 1)]?._id
      : selectedResourceId;
    onClose(resourceId);
    requestAnimationFrame(() => tabRefs.current.get(focusId)?.focus());
  }

  function handleKeyDown(event, index) {
    if (event.key === "Delete" && canManage) {
      event.preventDefault();
      event.stopPropagation();
      closeResource(resources[index]._id);
      return;
    }
    let next;
    if (event.key === "ArrowRight") next = (index + (ar ? -1 : 1) + resources.length) % resources.length;
    if (event.key === "ArrowLeft") next = (index + (ar ? 1 : -1) + resources.length) % resources.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = resources.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const resourceId = resources[next]._id;
    tabRefs.current.get(resourceId)?.focus();
    onSelect(resourceId);
  }

  return (
    <div className="cr-resource-workspace" hidden={suspended} dir={ar ? "rtl" : "ltr"}>
      <div className="cr-resource-workspace__panels">
        {resources.map((resource, index) => {
          const active = resource._id === selectedResourceId;
          return (
            <div key={resource._id} id={`${id}-panel-${index}`} role="tabpanel"
              aria-labelledby={`${id}-tab-${index}`} hidden={!active || suspended}
              className="cr-resource-workspace__panel" ref={active ? scrollContainerRef : undefined}>
              {renderResource(resource, active && !suspended)}
            </div>
          );
        })}
        {!selectedResourceId && !suspended && emptyContent}
      </div>
      {resources.length > 0 && (
        <div className="cr-resource-tabs">
          <div className="cr-resource-tabs__list" role="tablist" aria-label={ar ? "الموارد المفتوحة" : "Open resources"}>
            {resources.map((resource, index) => {
              const active = resource._id === selectedResourceId;
              const title = resource.title || resource.name || resource.fileName || (ar ? "مورد" : "Resource");
              return (
                <div className={`cr-resource-tabs__item${active ? " cr-resource-tabs__item--active" : ""}`} key={resource._id}>
                  <button type="button" role="tab" id={`${id}-tab-${index}`}
                    aria-controls={`${id}-panel-${index}`} aria-selected={active}
                    tabIndex={active ? 0 : -1} title={title}
                    ref={(node) => { if (node) tabRefs.current.set(resource._id, node); else tabRefs.current.delete(resource._id); }}
                    onClick={() => onSelect(resource._id)} onKeyDown={(event) => handleKeyDown(event, index)}>
                    <BookOpen size={13} aria-hidden="true" /><span>{title}</span>
                  </button>
                  {canManage && <button type="button" className="cr-resource-tabs__close"
                    aria-label={ar ? `إغلاق ${title}` : `Close ${title}`}
                    title={ar ? "إغلاق المورد" : "Close resource"}
                    onClick={() => closeResource(resource._id)}><X size={12} aria-hidden="true" /></button>}
                </div>
              );
            })}
          </div>
          {canManage && <button type="button" className="cr-resource-tabs__add" onClick={onOpenPicker}
            aria-label={ar ? "فتح مورد" : "Open resource"} title={ar ? "فتح مورد" : "Open resource"}>
            <Plus size={15} aria-hidden="true" />
          </button>}
        </div>
      )}
    </div>
  );
}
