import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PdfViewerWithSidebar from '../../app/resources/prep/PdfViewerWithSidebar';
import { handlePrepChannelMessage } from '../../app/resources/prep/prepRealtimeSync';

function Harness() {
  const [source, setSource] = useState('landscape.pdf');
  window.selectPdf = setSource;
  window.pdfSource = source;
  window.receiveView = message => handlePrepChannelMessage(message, {
    resourceId:'test-pdf',isTeacher:false,isPdf:true,pdfCurrentPage:window.pdfNav?.currentPage,
    pdfNavApiRef:{current:window.pdfNav},pdfScrollRef:{current:document.querySelector('.prep-pdf-main-inner')},
  });
  return <div className="cr-shell" style={{height:'100vh',width:'100%'}}>
    <PdfViewerWithSidebar fileUrl={source} fitMode={window.testPdfFitMode || 'width'} hideSidebar
      onNavStateChange={(nav) => { window.pdfNav = nav; }}>
      <div data-test-annotation style={{position:'absolute',left:'10%',top:'10%',width:'5%',height:'5%'}} />
    </PdfViewerWithSidebar>
  </div>;
}
createRoot(document.getElementById('root')).render(<Harness />);
