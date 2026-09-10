// The textarea owns caret placement and scrolling. Its colored mirror must use
// the exact same content viewport, including space taken by native scrollbars.
export function syncPrepTextEditor(textarea) {
  const preview = textarea?.parentElement?.querySelector('.prep-text-box__rich-preview');
  if (!preview) return;
  preview.style.width = `${textarea.clientWidth}px`;
  preview.style.height = `${textarea.clientHeight}px`;
  preview.style.left = `${textarea.offsetLeft + textarea.clientLeft}px`;
  preview.style.top = `${textarea.offsetTop + textarea.clientTop}px`;
  preview.scrollTop = textarea.scrollTop;
  preview.scrollLeft = textarea.scrollLeft;
}

export function resizePrepTextEditor(textarea, fixedHeight = false) {
  if (!textarea) return;
  const { scrollTop, scrollLeft } = textarea;
  textarea.style.height = fixedHeight ? '100%' : 'auto';
  if (!fixedHeight) textarea.style.height = `${textarea.scrollHeight}px`;
  textarea.scrollTop = scrollTop;
  textarea.scrollLeft = scrollLeft;
  syncPrepTextEditor(textarea);
}

export function getPrepTextClickOffset(label, x, y, textLength) {
  const doc = label.ownerDocument;
  const position = doc.caretPositionFromPoint?.(x, y);
  const caret = position ? null : doc.caretRangeFromPoint?.(x, y);
  const node = position?.offsetNode || caret?.startContainer;
  const offset = position?.offset ?? caret?.startOffset;
  if (!node || !label.contains(node)) return textLength;
  const range = doc.createRange();
  range.selectNodeContents(label);
  range.setEnd(node, offset);
  return Math.min(textLength, range.toString().length);
}
