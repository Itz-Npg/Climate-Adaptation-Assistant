import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Visible breadcrumb trail. The matching BreadcrumbList JSON-LD is emitted by
 * useSeo({ breadcrumbs }) on the same page.
 *
 * items: [{ label, to }] — omit `to` on the current page.
 */
export default function Breadcrumbs({ items = [], className = '' }) {
  const trail = [{ label: 'Home', to: '/' }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={`text-xs text-muted ${className}`}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index === 0 ? <Home className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {isLast || !item.to ? (
                <span aria-current="page" className="font-medium text-ink">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="hover:text-forest-700 hover:underline">
                  {item.label}
                </Link>
              )}
              {!isLast ? <ChevronRight className="h-3 w-3 text-line" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
