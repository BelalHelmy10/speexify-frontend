// lib/network-profile.js

function readConnection() {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null
  );
}

export function getNetworkProfile() {
  const connection = readConnection();
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  const saveData = Boolean(connection?.saveData);

  const isLowBandwidth =
    saveData || effectiveType === "slow-2g" || effectiveType === "2g";

  return {
    effectiveType,
    saveData,
    isLowBandwidth,
  };
}

export function subscribeToNetworkProfileChanges(listener) {
  const connection = readConnection();
  if (!connection || typeof connection.addEventListener !== "function") {
    return () => {};
  }

  const handler = () => listener(getNetworkProfile());
  connection.addEventListener("change", handler);

  return () => {
    connection.removeEventListener("change", handler);
  };
}
