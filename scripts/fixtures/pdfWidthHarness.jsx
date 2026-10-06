import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PdfViewerWithSidebar from '../../app/resources/prep/PdfViewerWithSidebar';

function Harness() {
  const [source, setSource] = useState('landscape.pdf');
  window.selectPdf = setSource;
  window.pdfSource = source;
  return <div className="cr-shell" style={{height:'100vh',width:'100%'}}>
    <PdfViewerWithSidebar fileUrl={source} fitMode="width" hideSidebar
      onNavStateChange={(nav) => { window.pdfNav = nav; }}>
      <div data-test-annotation style={{position:'absolute',left:'10%',top:'10%',width:'5%',height:'5%'}} />
    </PdfViewerWithSidebar>
  </div>;
}
createRoot(document.getElementById('root')).render(<Harness />);
