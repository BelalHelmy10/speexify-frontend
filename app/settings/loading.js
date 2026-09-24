export default function SettingsLoading() {
  return (
    <div className="settings-loading" role="status" aria-live="polite">
      <div className="settings-loading__spinner" aria-hidden="true">◌</div>
      <strong>Loading your account settings…</strong>
      <span>Preparing your profile, security, and preferences.</span>
    </div>
  );
}
