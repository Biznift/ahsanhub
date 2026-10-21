import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteWidgets } from "@/components/site-widgets";
import { JsonLd } from "@/components/json-ld";
import { getCategories, getSite } from "@/lib/api";
import { SITE_URL } from "@/lib/format";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: site.seoTitle, template: `%s | ${site.name}` },
    description: site.seoDescription,
    keywords: site.keywords,
    applicationName: site.name,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: site.name, title: site.seoTitle, description: site.seoDescription, url: SITE_URL },
    twitter: { card: "summary_large_image", title: site.seoTitle, description: site.seoDescription },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, categories] = await Promise.all([getSite(), getCategories()]);
  const gaId = site.gaId && /^G-[A-Z0-9]{4,20}$/.test(site.gaId) ? site.gaId : "";
  const pixelId = site.pixelId && /^\d{5,20}$/.test(site.pixelId) ? site.pixelId : "";
  const theme = site.theme === "light" || site.theme === "dark" ? site.theme : "system";
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers theme={theme}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
            Skip to content
          </a>
          {site.maintenance ? (
            <main id="main" className="mx-auto max-w-lg px-5 py-24 text-center">
              <h1 className="text-2xl font-semibold text-ink">{site.name} is briefly down for maintenance.</h1>
              <p className="mt-3 text-muted">Please check back soon. You can still email {site.contactEmail}.</p>
            </main>
          ) : (
            <>
              <SiteHeader name={site.name} announcement={site.announcement} />
              <main id="main">{children}</main>
              <SiteFooter site={site} categories={categories} />
              <SiteWidgets site={site} />
            </>
          )}
        </Providers>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
          </>
        )}
        {pixelId && (
          <Script id="pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}</Script>
        )}
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: site.name,
              url: SITE_URL,
              potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/explore?q={search_term_string}`, "query-input": "required name=search_term_string" },
            },
            { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: SITE_URL, logo: `${SITE_URL}/icon.svg`, email: site.contactEmail },
          ]}
        />
      </body>
    </html>
  );
}
