import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server.browser";
import ResilientAvatar from "../../../components/ResilientAvatar.jsx";

// Server-renders the avatar like the site header does, and lets the test
// choose when React takes over (after the image has already failed).
const element = (
  <span className="test-avatar">
    <ResilientAvatar src={window.feedbackTest.props.src} alt="" fallback="BH" />
  </span>
);
const root = document.getElementById("root");
root.innerHTML = renderToString(element);
window.feedbackTest.hydrate = () => hydrateRoot(root, element);
