import { createRoot } from "react-dom/client";
import UnitsOverview from "../../../components/units/UnitsOverview.jsx";
import UnitDetail from "../../../components/units/UnitDetail.jsx";

// Renders "Your units" or one unit page the way the dashboard routes do.
const props = window.feedbackTest.props || {};
const locale = props.locale || "en";
const shared = { locale, prefix: locale === "ar" ? "/ar" : "", learnerId: props.learnerId || null };

createRoot(document.getElementById("root")).render(
  props.unitId ? <UnitDetail unitId={props.unitId} {...shared} /> : <UnitsOverview {...shared} />
);
