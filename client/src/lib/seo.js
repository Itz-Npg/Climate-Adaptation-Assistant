import { useEffect } from 'react';

const SITE_NAME = 'Climate Adaptation Assistant';
const DEFAULT_DESCRIPTION =
  'Understand local climate risks, plan household adaptation tasks and compare places — a student project for climate resilience.';

function siteUrl() {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function upsertMeta(attribute, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel, href, extra = {}) {
  if (!href) return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
  for (const [key, value] of Object.entries(extra)) tag.setAttribute(key, value);
}

function setJsonLd(id, data) {
  const selector = `script[data-jsonld="${id}"]`;
  if (!data) {
    document.head.querySelector(selector)?.remove();
    return;
  }
  let script = document.head.querySelector(selector);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.jsonld = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/**
 * Per-page document head: title, description, canonical URL, Open Graph,
 * Twitter cards and optional JSON-LD structured data.
 */
export function useSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = '/og-image.png',
  type = 'website',
  noIndex = false,
  jsonLd,
  breadcrumbs,
} = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const url = `${siteUrl()}${path || (typeof window !== 'undefined' ? window.location.pathname : '/')}`;
    const absoluteImage = image.startsWith('http') ? image : `${siteUrl()}${image}`;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', url);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', absoluteImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} — prepare today for a climate-resilient tomorrow`);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', absoluteImage);

    setJsonLd(
      'page',
      jsonLd || {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: fullTitle,
        description,
        url,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: siteUrl() },
      }
    );

    setJsonLd(
      'breadcrumbs',
      breadcrumbs && breadcrumbs.length
        ? {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.label,
              item: `${siteUrl()}${item.to}`,
            })),
          }
        : null
    );
    // Stringify structured data so inline object literals do not re-run the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type, noIndex, JSON.stringify(jsonLd), JSON.stringify(breadcrumbs)]);
}

export { SITE_NAME, DEFAULT_DESCRIPTION, siteUrl };
