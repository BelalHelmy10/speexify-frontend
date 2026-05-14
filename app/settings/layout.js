import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Settings", "/settings", "en");

export default function SettingsLayout({ children }) {
  return children;
}
