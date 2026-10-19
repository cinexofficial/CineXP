export function PageHeading({ eyebrow, title, description }: {
  eyebrow: string; title: string; description?: string;
}) {
  return <div className="cx-page-heading"><p className="cx-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>;
}
