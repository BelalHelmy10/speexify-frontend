// app/about/page.js
export const metadata = {
  title: "About – Speexify",
  description:
    "Learn about Speexify’s mission and our approach to applied English coaching.",
};

import About from "../../src/pages/About";
export default function Page() {
  return <About />;
}
