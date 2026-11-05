import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, LifeBuoy, Mail, Search, ShieldCheck } from "lucide-react";
import styles from "./contact.module.css";

const supportEmail = "support@easygrantpath.com";

const inquiryTypes = [
  {
    icon: Search,
    title: "Opportunity questions",
    copy: "Share the opportunity title or link and tell us what you need clarified.",
    subject: "Question about an opportunity",
  },
  {
    icon: FileText,
    title: "Application support",
    copy: "Tell us where you are in the process and the deadline you are working toward.",
    subject: "Application support request",
  },
  {
    icon: LifeBuoy,
    title: "Account or technical help",
    copy: "Describe what happened and include the exact error message, if there is one.",
    subject: "Account or technical support",
  },
] as const;

export const metadata: Metadata = {
  title: "Contact support",
  description: "Contact EasyGrantPath for opportunity, application, account, or technical support.",
};

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="EasyGrantPath home">
          <Image src="/logo.png" alt="" width={156} height={52} priority />
        </Link>
        <nav aria-label="Contact navigation">
          <Link href="/#opportunities">Opportunities</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/sign-in">Sign in</Link>
        </nav>
        <Link href="/" className={styles.backLink}><ArrowLeft aria-hidden="true" /> Back home</Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> Contact EasyGrantPath</p>
            <h1>Let&rsquo;s make the next step <em>clearer.</em></h1>
            <p>Questions about an opportunity, your application, or the platform? Send us the context and we&rsquo;ll help you find the right way forward.</p>
            <a className={styles.primaryAction} href={`mailto:${supportEmail}?subject=${encodeURIComponent("EasyGrantPath support request")}`}>
              Email support <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div className={styles.heroVisual}>
            <Image src="/home/research.jpg" alt="A professional reviewing research and application materials" fill priority sizes="(max-width: 820px) 100vw, 48vw" />
            <div className={styles.heroShade} />
            <div className={styles.emailCard}>
              <Mail aria-hidden="true" />
              <div><span>Support email</span><a href={`mailto:${supportEmail}`}>{supportEmail}</a></div>
            </div>
          </div>
        </section>

        <section className={styles.contactSection} aria-labelledby="choose-support">
          <div className={styles.sectionIntro}>
            <p className={styles.kicker}>Start with the right context</p>
            <h2 id="choose-support">What can we help with?</h2>
            <p>Choose the closest topic to open a new email with a useful subject line already added.</p>
          </div>
          <div className={styles.inquiryGrid}>
            {inquiryTypes.map(({ icon: Icon, title, copy, subject }, index) => (
              <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`} className={styles.inquiryCard} key={title}>
                <div className={styles.cardTop}><span>0{index + 1}</span><Icon aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className={styles.cardLink}>Write to support <ArrowRight aria-hidden="true" /></span>
              </a>
            ))}
          </div>
        </section>

        <section className={styles.preparation}>
          <div className={styles.preparationImage}>
            <Image src="/home/technology.jpg" alt="Two professionals reviewing information together" fill sizes="(max-width: 820px) 100vw, 42vw" />
          </div>
          <div className={styles.preparationCopy}>
            <p className={styles.kicker}>Help us help you</p>
            <h2>A little context goes a long way.</h2>
            <p>Including the essentials in your first email helps us understand the issue without unnecessary back-and-forth.</p>
            <ul>
              <li><span>01</span>Your name and country</li>
              <li><span>02</span>The opportunity title or page link</li>
              <li><span>03</span>Your deadline and the support you need</li>
              <li><span>04</span>For technical issues, the exact error message</li>
            </ul>
            <div className={styles.privacyNote}><ShieldCheck aria-hidden="true" /><p><strong>Protect your information.</strong> Do not email passwords, banking details, or identity documents unless our support team specifically requests a secure submission.</p></div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <p className={styles.eyebrow}><span /> Ready when you are</p>
          <h2>Tell us what you&rsquo;re working through.</h2>
          <p>Our support inbox is the best place to begin.</p>
          <a href={`mailto:${supportEmail}?subject=${encodeURIComponent("EasyGrantPath support request")}`}>{supportEmail} <ArrowRight aria-hidden="true" /></a>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" aria-label="EasyGrantPath home"><Image src="/logo.png" alt="" width={158} height={53} /></Link>
        <p>Credible opportunity discovery and application support across West Africa.</p>
        <div><Link href="/dashboard/opportunities">Explore opportunities</Link><Link href="/sign-up">Create account</Link></div>
      </footer>
    </div>
  );
}