// app/ar/page.js

// This imports the default export from app/page.js (your English homepage)
import Page from "../page";

export default function ArabicHomePage() {
  // For now we just render the same component.
  // Auth + redirects all work exactly the same.
  return <Page />;
}
