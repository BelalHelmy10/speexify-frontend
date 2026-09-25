import { noIndexMetadata } from "../../seo";
import "@/styles/resources.scss";
import "@/styles/classroom-experience.scss";

export const metadata = noIndexMetadata("الفصل", "/classroom", "ar");

export default function ArabicClassroomLayout({ children }) {
  return children;
}
