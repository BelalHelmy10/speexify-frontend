// app/resources/prep/PrepStyleControls.jsx

export default function PrepStyleControls({
  widthPickerRef,
  setShowWidthPicker,
  setColorMenuOpen,
  setToolMenuOpen,
  widthLabel,
  penStrokeWidth,
  showWidthPicker,
  STROKE_WIDTH_OPTIONS,
  setPenStrokeWidth,
  colorMenuRef,
  penColor,
  colorMenuOpen,
  PEN_COLORS,
  setPenColor,
}) {
  return (
    <>
      <div className="prep-width-picker" ref={widthPickerRef}>
        <button
          type="button"
          className="prep-width-picker__trigger"
          onClick={() => {
            setShowWidthPicker((v) => !v);
            setColorMenuOpen(false);
            setToolMenuOpen(false);
          }}
          title={widthLabel || "Stroke Width"}
        >
          <span
            className="prep-width-picker__preview"
            style={{
              width: `${penStrokeWidth + 4}px`,
              height: `${penStrokeWidth + 4}px`,
            }}
          />
          <span className="prep-width-picker__label">{penStrokeWidth}px</span>
        </button>

        {showWidthPicker && (
          <div className="prep-width-picker__menu">
            {STROKE_WIDTH_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                className={`prep-width-picker__option${
                  penStrokeWidth === w ? " is-active" : ""
                }`}
                onClick={() => {
                  setPenStrokeWidth(w);
                  setShowWidthPicker(false);
                }}
              >
                <span
                  className="prep-width-picker__dot"
                  style={{
                    width: `${w + 4}px`,
                    height: `${w + 4}px`,
                  }}
                />
                <span>{w}px</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="prep-annotate-colors">
        <div
          className="prep-annotate-colors__dropdown"
          ref={colorMenuRef}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            className="prep-annotate-color prep-annotate-color--picker"
            style={{ backgroundColor: penColor }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setColorMenuOpen((v) => !v);
              setToolMenuOpen(false);
            }}
          />

          {colorMenuOpen && (
            <div
              className="prep-annotate-colors__menu"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={
                    "prep-annotate-color" + (penColor === c ? " is-active" : "")
                  }
                  style={{ backgroundColor: c }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPenColor(c);
                    setColorMenuOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
