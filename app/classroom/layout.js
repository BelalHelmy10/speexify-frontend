import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Classroom", "/classroom", "en");

export default function ClassroomLayout({ children }) {
  return children;
}
