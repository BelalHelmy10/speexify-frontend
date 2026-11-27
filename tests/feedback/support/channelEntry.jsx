import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useClassroomChannel } from "../../../app/resources/prep/useClassroomChannel.js";

// Shows the live connection state and every event received, for the test.
function ChannelProbe() {
  const channel = useClassroomChannel("42");
  useEffect(() => {
    window.channelEvents = window.channelEvents || [];
    return channel.subscribe((event) => window.channelEvents.push(event));
  }, [channel]);
  return (
    <p className="probe" data-ready={String(channel.ready)} data-status={channel.status}>
      {channel.status}
    </p>
  );
}

createRoot(document.getElementById("root")).render(<ChannelProbe />);
