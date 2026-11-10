import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, FileText, LifeBuoy, Mail, Search, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import styles from "./contact.module.css";

const supportEmail = "support@easygrantpath.com";
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact.meta");
  return { title: t("title"), description: t("description") };
}

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const inquiryTypes = [
    { key: "opportunity", icon: Search },
    { key: "application", icon: FileText },
    { key: "technical", icon: LifeBuoy },
  ] as const;
  const supportSubject = t("supportSubject");
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={t("homeLabel")}><Image src="/logo.png" alt="" width={156} height={52} priority /></Link>
        <nav aria-label={t("navLabel")}><Link href="/#opportunities">{t("nav.opportunities")}</Link><Link href="/#how-it-works">{t("nav.howItWorks")}</Link><Link href="/sign-in">{t("nav.signIn")}</Link></nav>
        <LanguageSwitcher compact />
        <Link href="/" className={styles.backLink}><ArrowLeft aria-hidden="true" /> {t("nav.backHome")}</Link>
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> {t("hero.eyebrow")}</p>
            <h1>{t("hero.heading")}</h1>
            <p>{t("hero.description")}</p>
            <a className={styles.primaryAction} href={"mailto:" + supportEmail + "?subject=" + encodeURIComponent(supportSubject)}>{t("hero.emailSupport")} <ArrowRight aria-hidden="true" /></a>
          </div>
          <div className={styles.heroVisual}>
            <Image src="/home/research.jpg" alt={t("hero.imageAlt")} fill priority sizes="(max-width: 820px) 100vw, 48vw" />
            <div className={styles.heroShade} />
            <div className={styles.emailCard}><Mail aria-hidden="true" /><div><span>{t("hero.supportEmailLabel")}</span><a href={"mailto:" + supportEmail}>{supportEmail}</a></div></div>
          </div>
        </section>
        <section className={styles.contactSection} aria-labelledby="choose-support">
          <div className={styles.sectionIntro}><p className={styles.kicker}>{t("inquiries.kicker")}</p><h2 id="choose-support">{t("inquiries.heading")}</h2><p>{t("inquiries.description")}</p></div>
          <div className={styles.inquiryGrid}>
            {inquiryTypes.map(({ key, icon: Icon }, index) => {
              const title = t("inquiries.types." + key + ".title" as never);
              const subject = t("inquiries.types." + key + ".subject" as never);
              return <a href={"mailto:" + supportEmail + "?subject=" + encodeURIComponent(subject)} className={styles.inquiryCard} key={key}>
                <div className={styles.cardTop}><span>0{index + 1}</span><Icon aria-hidden="true" /></div><h3>{title}</h3><p>{t("inquiries.types." + key + ".copy" as never)}</p><span className={styles.cardLink}>{t("inquiries.writeTo")} <ArrowRight aria-hidden="true" /></span>
              </a>;
            })}
          </div>
        </section>
        <section className={styles.preparation}>
          <div className={styles.preparationImage}><Image src="/home/technology.jpg" alt={t("preparation.imageAlt")} fill sizes="(max-width: 820px) 100vw, 42vw" /></div>
          <div className={styles.preparationCopy}>
            <p className={styles.kicker}>{t("preparation.kicker")}</p><h2>{t("preparation.heading")}</h2><p>{t("preparation.description")}</p>
            <ul>{([1,2,3,4] as const).map((item) => <li key={item}><span>{"0" + item}</span>{t(("preparation.items." + item) as never)}</li>)}</ul>
            <div className={styles.privacyNote}><ShieldCheck aria-hidden="true" /><p><strong>{t("preparation.privacyNote.title")}</strong> {t("preparation.privacyNote.body")}</p></div>
          </div>
        </section>
        <section className={styles.finalCta}><p className={styles.eyebrow}><span /> {t("finalCta.eyebrow")}</p><h2>{t("finalCta.heading")}</h2><p>{t("finalCta.description")}</p><a href={"mailto:" + supportEmail + "?subject=" + encodeURIComponent(supportSubject)}>{supportEmail} <ArrowRight aria-hidden="true" /></a></section>
      </main>
      <footer className={styles.footer}><Link href="/" aria-label={t("homeLabel")}><Image src="/logo.png" alt="" width={158} height={53} /></Link><p>{t("footer.description")}</p><div><Link href="/dashboard/opportunities">{t("nav.opportunities")}</Link><Link href="/sign-up">{t("nav.signIn")}</Link></div></footer>
    </div>
  );
}
