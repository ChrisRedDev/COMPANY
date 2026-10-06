import type { Metadata } from "next";

export const SITE_NAME = "Local Plumbing Services · Growth OS";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
export const SITE_DESCRIPTION =
  "The Local Plumbing Services owner workspace: enquiries, calls, quotes, booked jobs, paid search, tracking health, SEO Search Audit and Company Brain.";
export const DEFAULT_OG_IMAGE = "/opengraph-image";

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export type SiteRoute = {
  path: string;
  title: string;
  description: string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
};

export const SITE_ROUTES: SiteRoute[] = [
  {
    path: "/",
    title: "Firmy",
    description: SITE_DESCRIPTION,
    changeFrequency: "weekly",
    priority: 1,
  },
];

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      locale: "en_GB",
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: absoluteUrl(image) }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image)],
    },
  };
}
