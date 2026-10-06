export default function ResourcesLoading() {
  return (
    <main className="spx-resources-page" role="status" aria-live="polite">
      <div className="spx-resources-page__inner spx-resources-loading">
        <header className="spx-resources-hero spx-resources-loading__hero">
          <div className="spx-resources-hero__copy">
            <span className="spx-resources-loading__line spx-resources-loading__line--eyebrow" />
            <span className="spx-resources-loading__line spx-resources-loading__line--title" />
            <span className="spx-resources-loading__line spx-resources-loading__line--subtitle" />
          </div>
          <div className="spx-resources-loading__stats" aria-hidden="true">
            {[1, 2, 3, 4].map((item) => <span key={item} />)}
          </div>
        </header>
        <p className="spx-resources-loading__message">Preparing your resource library…</p>
        <div className="spx-resources-loading__cards" aria-hidden="true">
          {[1, 2, 3].map((item) => <span key={item} />)}
        </div>
      </div>
    </main>
  );
}
