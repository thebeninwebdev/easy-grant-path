"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { io } from "next/cache";
import { ArrowDown, ArrowRight, Check, ChevronRight, FilePenLine, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Suspense, use, useEffect, useRef, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import styles from "./homepage.module.css";

function CurrentYear() {
  use(io());
  return new Date().getFullYear();
}

export function Homepage({ opportunityShowcase }: { opportunityShowcase: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const t = useTranslations();
  const countries = (["CI", "GH", "SN", "NG", "BJ"] as const).map((code) => ({ code, name: t(("Home.countries.list." + code + ".name") as never), detail: t(("Home.countries.list." + code + ".detail") as never) }));
  const steps = (["discover", "prepare", "getSupport"] as const).map((key, index) => ({ number: "0" + (index + 1), icon: [Search, FilePenLine, ShieldCheck][index], title: t(("Home.howItWorks.steps." + key + ".title") as never), copy: t(("Home.howItWorks.steps." + key + ".copy") as never) }));

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const changingLocale = Boolean(document.documentElement.dataset.localeTransitionTo);
    if (reduced || changingLocale || !root.current) return;
    let cancelled = false;
    let context: { revert: () => void } | undefined;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, triggerModule]) => {
      if (cancelled || !root.current) return;
      const gsap = gsapModule.gsap;
      gsap.registerPlugin(triggerModule.ScrollTrigger);
      context = gsap.context(() => {
        gsap.to("[data-parallax]", { yPercent: 7, ease: "none", scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: 0.8 } });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, { y: 54, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 86%", once: true } });
        });

        const processTimeline = gsap.timeline({ scrollTrigger: { trigger: "[data-process]", start: "top 72%", once: true } });
        processTimeline
          .to("[data-process-line]", { scaleX: 1, duration: 0.7, stagger: 0.12, ease: "power2.out" })
          .from("[data-process-card]", { y: 34, opacity: 0, duration: 0.72, stagger: 0.14, ease: "power3.out" }, 0.08);
      }, root);

      triggerModule.ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      context?.revert();
    };
  }, []);

  return (
    <div ref={root} className={styles.page}>
      <a className={styles.skipLink} href="#main-content">{t("Common.skipToContent")}</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={t("Common.homeLabel")}><Image src="/logo.png" alt="" width={156} height={52} priority /></Link>
        <nav className={styles.desktopNav} aria-label={t("Navigation.mainLabel")}>
          <a href="#opportunities">{t("Navigation.opportunities")}</a><a href="#how-it-works">{t("Navigation.howItWorks")}</a><a href="#support">{t("Navigation.support")}</a><a href="#countries">{t("Navigation.countries")}</a>
        </nav>
        <div className={styles.headerActions}><LanguageSwitcher compact /><Link href="/sign-in" className={styles.textLink}>{t("Navigation.signIn")}</Link><Link href="/sign-up" className={styles.headerCta}>{t("Navigation.createAccount")} <ArrowRight aria-hidden="true" /></Link></div>
        <details className={styles.mobileMenu}><summary aria-label={t("Navigation.openNavigation")}><Menu /></summary><nav aria-label={t("Navigation.mobileLabel")}><LanguageSwitcher /><a href="#opportunities">{t("Navigation.opportunities")}</a><a href="#how-it-works">{t("Navigation.howItWorks")}</a><a href="#support">{t("Navigation.support")}</a><a href="#countries">{t("Navigation.countries")}</a><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></nav></details>
      </header>

      <main id="main-content">
        <section className={styles.hero} data-hero>
          <div className={styles.heroTexture} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow} data-hero-copy><span /> {t("Home.hero.kicker")}</p>
            <h1>{[t("Home.hero.heading1"), t("Home.hero.heading2"), t("Home.hero.heading3")].map((line) => <span className={styles.heroLine} key={line}><span data-hero-word>{line}</span></span>)}</h1>
            <p className={styles.heroCopy} data-hero-copy>{t("Home.hero.description")}</p>
            <div className={styles.heroActions} data-hero-actions>
              <Link href="/dashboard/opportunities" className={styles.primaryButton}>{t("Home.hero.exploreButton")} <ArrowRight aria-hidden="true" /></Link>
              <a href="#how-it-works" className={styles.secondaryButton}>{t("Home.hero.learnMoreButton")} <ArrowDown aria-hidden="true" /></a>
            </div>
          </div>
          <div className={styles.heroVisual} data-hero-visual>
            <div className={styles.heroImage} data-parallax><Image src="/home/hero.jpg" alt={t("Home.hero.imageAlt")} fill priority sizes="(max-width: 767px) 100vw, 54vw" /></div>
            <div className={styles.heroNote}><Sparkles aria-hidden="true" /><span><strong>{t("Home.hero.noteTitle")}</strong>{t("Home.hero.noteBody")}</span></div>
            <p className={styles.photoCredit}>{t("Home.hero.photoCredit")}</p>
          </div>
          <a href="#mission" className={styles.scrollCue} aria-label={t("Home.hero.scrollMission")}><span>{t("Home.hero.scrollExplore")}</span><i /></a>
        </section>

        <section id="mission" className={styles.mission}>
          <div className={styles.sectionNumber}>{t("Home.mission.number")}</div>
          <div className={styles.missionGrid}>
            <h2 data-reveal>{t("Home.mission.heading")}<br /><em>{t("Home.mission.emphasis")}</em></h2>
            <div data-reveal><p className={styles.missionLead}>{t("Home.mission.lead")}</p><p>{t("Home.mission.body")}</p></div>
          </div>
        </section>

        <section id="opportunities" className={styles.opportunities}>
          <div className={styles.sectionHeading} data-reveal><div><p className={styles.kicker}>{t("Home.showcase.kicker")}</p><h2>{t("Home.showcase.heading1")}<br />{t("Home.showcase.heading2")}</h2></div><p>{t("Home.showcase.description")}</p></div>
          {opportunityShowcase}
          <div className={styles.centerAction} data-reveal><Link href="/dashboard/opportunities" className={styles.underlinedLink}>{t("Home.showcase.viewAll")} <ArrowRight aria-hidden="true" /></Link></div>
        </section>

        <section id="how-it-works" className={styles.process} data-process>
          <div className={styles.processVisual}><Image src="/home/collaboration.jpg" alt={t("Home.process.imageAlt")} fill sizes="(max-width: 1023px) 100vw, 45vw" /><div className={styles.processOverlay}><p>{t("Home.process.overlayTitle")}</p><span>{t("Home.process.overlayBody")}</span></div></div>
          <div className={styles.processContent}>
            <p className={styles.kicker}>{t("Home.process.kicker")}</p><h2>{t("Home.process.heading1")}<br />{t("Home.process.heading2")}</h2>
            <div className={styles.progressLines}>{steps.map((step, index) => <span key={step.number}><i data-process-line={index} /></span>)}</div>
            <div className={styles.processCards}>{steps.map(({ number, icon: Icon, title, copy }) => <article data-process-card key={number}><div className={styles.stepTop}><span>{number}</span><Icon aria-hidden="true" /></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
          </div>
        </section>

        <section id="countries" className={styles.countries}>
          <div className={styles.countryIntro} data-reveal><p className={styles.kicker}>{t("Home.countries.kicker")}</p><h2>{t("Home.countries.heading1")}<br /><em>{t("Home.countries.heading2")}</em></h2><p>{t("Home.countries.description")}</p></div>
          <div className={styles.mapWrap} data-reveal><svg viewBox="0 0 620 440" role="img"><title>{t("Home.countries.imageTitle")}</title><path d="M104 77 258 42l183 59 77 104-23 148-151 54-139-39-81-97-43-106Z" /><path className={styles.mapRiver} d="M329 79c-20 78 54 108 19 173-22 41-12 86 29 122" /><circle cx="385" cy="233" r="10" /><circle cx="322" cy="248" r="8" /><circle cx="248" cy="201" r="8" /><circle cx="405" cy="286" r="8" /><circle cx="427" cy="264" r="7" /><text x="407" y="226">Nigeria</text><text x="274" y="278">Ghana</text><text x="188" y="190">Senegal</text><text x="438" y="289">Benin</text><text x="294" y="221">Côte d’Ivoire</text></svg><span>{t("Home.countries.atlantic")}</span></div>
          <div className={styles.countryList} data-reveal>{countries.map((country, index) => <Link href={`/dashboard/opportunities?country=${encodeURIComponent(country.name)}`} key={country.code}><span className={styles.countryIndex}>0{index + 1}</span><span><strong>{country.name}</strong><small>{country.detail}</small></span><ChevronRight aria-hidden="true" /></Link>)}</div>
        </section>

        <section id="support" className={styles.support}>
          <div className={styles.supportImage} data-reveal><Image src="/home/technology.jpg" alt={t("Home.support.imageAlt")} fill sizes="(max-width: 767px) 100vw, 44vw" /><span>{t("Home.support.imageCaption")}</span></div>
          <div className={styles.supportContent} data-reveal><p className={styles.kicker}>{t("Home.support.kicker")}</p><h2>{t("Home.support.heading1")}<br /><em>{t("Home.support.heading2")}</em></h2><p>{t("Home.support.description")}</p><ul><li><Check aria-hidden="true" /> {t("Home.support.benefits.guided")}</li><li><Check aria-hidden="true" /> {t("Home.support.benefits.review")}</li><li><Check aria-hidden="true" /> {t("Home.support.benefits.assistance")}</li></ul><div className={styles.supportNotice}><ShieldCheck aria-hidden="true" /><p><strong>{t("Home.support.notice.title")}</strong> {t("Home.support.notice.body")}</p></div><Link href="/sign-up" className={styles.underlinedLink}>{t("Home.support.cta")} <ArrowRight aria-hidden="true" /></Link></div>
        </section>

        <section className={styles.finalCta}>
          <Image src="/home/enterprise.jpg" alt={t("Home.finalCta.imageAlt")} fill sizes="100vw" />
          <div className={styles.finalShade} />
          <div className={styles.finalContent} data-reveal><p className={styles.eyebrow}><span /> {t("Home.finalCta.eyebrow")}</p><h2>{t("Home.finalCta.heading1")}<br />{t("Home.finalCta.heading2")}</h2><p>{t("Home.finalCta.description")}</p><div><Link href="/dashboard/opportunities" className={styles.lightButton}>{t("Home.hero.exploreButton")} <ArrowRight aria-hidden="true" /></Link><Link href="/sign-up" className={styles.ghostButton}>{t("Home.finalCta.signUpButton")}</Link></div></div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}><div><Image src="/logo.png" alt="EasyGrantPath" width={170} height={57} /><p>{t("Home.footer.description")}</p></div><nav aria-label="Explore"><strong>{t("Home.footer.explore.title")}</strong><Link href="/dashboard/opportunities">Opportunities</Link><a href="#countries">{t("Navigation.countries")}</a><a href="#how-it-works">{t("Navigation.howItWorks")}</a></nav><nav aria-label="Account"><strong>{t("Home.footer.account.title")}</strong><Link href="/sign-up">Create account</Link><Link href="/sign-in">Sign in</Link><Link href="/dashboard">Dashboard</Link></nav><nav aria-label="Support"><strong>{t("Home.footer.supportSection.title")}</strong><a href="#support">Application support</a><Link href="/dashboard/proposals">{t("Home.footer.supportSection.proposalTools")}</Link><Link href="/contact">{t("Home.footer.supportSection.contact")}</Link><Link href="/terms">{t("Legal.terms.shortTitle")}</Link><Link href="/privacy">{t("Legal.privacy.shortTitle")}</Link><Link href="/refund-policy">{t("Legal.refund.shortTitle")}</Link></nav></div>
        <div className={styles.footerBottom}><span>© <Suspense fallback={null}><CurrentYear /></Suspense> EasyGrantPath</span><span>{t("Home.footer.builtFor")}</span></div>
      </footer>
    </div>
  );
}
