import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ClassroomResourceWorkspace from '../../app/classroom/[sessionId]/ClassroomResourceWorkspace.jsx';
import PrepShell from '../../app/resources/prep/PrepShell.jsx';
window.testState = {saved:[], state:{}};
window.channelSubscribers=new Set();
function Harness() {
  const [ids,setIds]=useState(['a','b']);
  const [selected,setSelected]=useState('a');
  return <ClassroomResourceWorkspace resources={ids.map(_id=>({_id,title:_id}))} selectedResourceId={selected}
    canManage onSelect={setSelected} onClose={id=>{setIds(ids.filter(i=>i!==id));setSelected(ids.find(i=>i!==id));}}
    onOpenPicker={()=>{setIds(['a','b']);setSelected('a');}}
    renderResource={(resource,active)=><PrepShell resource={resource} viewer={{viewerUrl:'about:blank',label:'Document'}} isActive={active} sessionId="annotations-test" isTeacher hideSidebar hideBreadcrumbs />}
  />;
}
createRoot(document.getElementById('root')).render(<Harness />);
