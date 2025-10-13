// app/about/page.js
import About from "../../src/pages/About";

export const metadata = {
  title: "About – Speexify",
  description:
    "Learn about Speexify’s mission and our approach to applied English coaching.",
};

export default function Page() {
  return <About />;
}
