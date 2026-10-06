import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PrepTextBoxesLayer from '../../app/resources/prep/PrepTextBoxesLayer';
import { resizePrepTextEditor } from '../../app/resources/prep/prepTextEditorDOM';

function Harness() {
  const [config, setConfig] = useState(null);
  const refs = useRef({});
  const blur = useRef(null);
  const current = useRef(config);
  current.current = config;
  window.configure = setConfig;
  const resize = useCallback(id => resizePrepTextEditor(refs.current[id], Boolean(current.current?.box.height)), []);
  if (!config) return null;
  return <div style={{position:'relative',width:1400,height:1100,fontFamily:'Arial'}}
    onMouseDown={() => { window.boardMouseDowns += 1; }}>
    <PrepTextBoxesLayer textBoxes={[config.box]} isPdf={config.isPdf} pdfCurrentPage={1}
      activeTextId={config.editing ? 'qa' : null} selectedItems={[]} annotationScale={config.scale}
      penColor="#123456" tool={config.tool || 'text'} TOOL_TEXT="text" TOOL_SELECT="select"
      getZIndexFromId={() => 10} deleteTextBox={() => {}} startTextDrag={e => { e.preventDefault(); e.stopPropagation(); }}
      blurDebounceRef={blur} startWidthResize={() => {}} startHeightResize={() => {}}
      textAreaRefs={refs} updateTextBoxText={(_,text) => setConfig(c=>({...c,box:{...c.box,text}}))}
      handleTextBoxBlur={() => {}} autoResizeTextarea={resize} startFontSizeResize={() => {}}
      setActiveTextId={() => setConfig(c=>({...c,editing:true}))} textPlaceholder="Type text"/>
  </div>;
}
window.boardMouseDowns = 0;
createRoot(document.getElementById('root')).render(<Harness/>);
