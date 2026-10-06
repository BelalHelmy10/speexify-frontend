"use client";

import { useRouter } from "next/navigation";

export default function ResourcesUnavailableState({ title, body, retryLabel }) {
  const router = useRouter();

  return (
    <section className="spx-resources-unavailable" role="alert" aria-live="polite">
      <div>
        <h2 className="spx-resources-unavailable__title">{title}</h2>
        <p className="spx-resources-unavailable__body">{body}</p>
      </div>
      <button
        type="button"
        className="spx-resources-unavailable__button"
        onClick={() => router.refresh()}
      >
        {retryLabel}
      </button>
    </section>
  );
}
