interface Props {
  /** The unit label, in the tale's own words. */
  unit: string;
}

/**
 * The foot of the page: where the reader puts its reading position, this app
 * puts the two reference routes and the unit label. Plain anchors — the one
 * way out of the inquiry is a link that cannot fail to load a script.
 */
export default function SiteFooter({ unit }: Props) {
  return (
    <footer className="st-footer">
      <div className="st-footer-inner">
        <span className="st-footer-unit">{unit}</span>
        <nav className="st-footer-nav" aria-label="Reference">
          <a href="/glossary">Glossary</a>
          <a href="/curriculum">Curriculum Mapping</a>
        </nav>
      </div>
    </footer>
  );
}
