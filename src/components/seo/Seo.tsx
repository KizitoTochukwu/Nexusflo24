import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SeoProps {
  title: string;
  description: string;
  /** Override og:type. Defaults to "website". Use "article" for blog posts. */
  type?: string;
  /** Override canonical/og:url path. Defaults to current pathname. */
  path?: string;
  /** Override og:image. Falls back to sitewide image from index.html. */
  image?: string;
  /** Optional extra JSON-LD structured data object. */
  jsonLd?: Record<string, unknown>;
}

const SITE_URL = "https://nexusflo24.com";

const Seo = ({ title, description, type = "website", path, image, jsonLd }: SeoProps) => {
  const { pathname } = useLocation();
  const url = `${SITE_URL}${path ?? pathname}`;
  const fullTitle = title.includes("NexusFlo24") ? title : `${title} | NexusFlo24`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default Seo;
