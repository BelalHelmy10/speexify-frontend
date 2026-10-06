import { noIndexMetadata } from "../seo";
import "@/styles/resources.scss";
import "@/styles/classroom-experience.scss";

export const metadata = noIndexMetadata("Classroom", "/classroom", "en");

export default function ClassroomLayout({ children }) {
  return children;
}
