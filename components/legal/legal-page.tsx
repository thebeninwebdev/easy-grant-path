import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { legalConfig, legalPath, type LegalPolicy } from "@/lib/legal";
import type { SupportedLocale } from "@/lib/config";
import styles from "./legal-page.module.css";

type PolicySection = { id: string; title: string; paragraphs: string[]; bullets?: string[] };

export async function LegalPage({ policy }: { policy: LegalPolicy }) {
  const [locale, t] = await Promise.all([
    getLocale() as Promise<SupportedLocale>,
    getTranslations("Legal"),
  ]);
  const sections = t.raw(`${policy}.sections`) as PolicySection[];
  const date = new Intl.DateTimeFormat(locale === "fr" ? "fr-CI" : "en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${legalConfig.lastUpdated}T00:00:00Z`));
  const policies = (["terms", "privacy", "refund"] as LegalPolicy[]).filter((item) => item !== policy);

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#policy-content">{t("skipToContent")}</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={t("homeLabel")}><Image src="/logo.png" alt="" width={156} height={52} priority /></Link>
        <div className={styles.headerActions}><Link href="/contact">{t("contact")}</Link><LanguageSwitcher compact /></div>
      </header>
      <main id="policy-content">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.kicker}>{t("kicker")}</p>
            <h1>{t(`${policy}.title`)}</h1>
            <p className={styles.summary}>{t(`${policy}.summary`)}</p>
            <p className={styles.updated}>{t("lastUpdated", { date })}</p>
          </div>
        </section>
        <div className={styles.layout}>
          <nav className={styles.toc} aria-label={t("contentsLabel")}>
            <strong>{t("contents")}</strong>
            <ol>{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
          </nav>
          <article className={styles.content}>
            {sections.map((section) => (
              <section className={styles.section} id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => paragraph.includes("support@easygrantpath.com")
                  ? <p key={paragraph}>{paragraph.split("support@easygrantpath.com")[0]}<a href={`mailto:${legalConfig.supportEmail}`}>{legalConfig.supportEmail}</a>{paragraph.split("support@easygrantpath.com")[1]}</p>
                  : <p key={paragraph}>{paragraph}</p>)}
                {section.bullets?.length ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
              </section>
            ))}
            <aside className={styles.related}>
              <h2>{t("relatedPolicies")}</h2>
              <nav>{policies.map((item) => <Link href={legalPath(item)} key={item}>{t(`${item}.title`)}</Link>)}</nav>
            </aside>
          </article>
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" aria-label={t("homeLabel")}><Image src="/logo.png" alt="" width={150} height={50} /></Link>
          <nav aria-label={t("footerLabel")}><Link href="/terms">{t("terms.shortTitle")}</Link><Link href="/privacy">{t("privacy.shortTitle")}</Link><Link href="/refund-policy">{t("refund.shortTitle")}</Link><Link href="/contact">{t("contact")}</Link></nav>
        </div>
      </footer>
    </div>
  );
}
