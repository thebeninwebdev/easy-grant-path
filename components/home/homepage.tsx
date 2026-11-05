"use client";

import Image from "next/image";
import Link from "next/link";
import { io } from "next/cache";
import { ArrowDown, ArrowRight, Check, ChevronRight, FilePenLine, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Suspense, use, useEffect, useRef, type ReactNode } from "react";
import styles from "./homepage.module.css";

const countries = [
  { name: "Côte d’Ivoire", code: "CI", detail: "Enterprise, climate and regional programmes" },
  { name: "Ghana", code: "GH", detail: "Research, education and social impact" },
  { name: "Senegal", code: "SN", detail: "Innovation, culture and green growth" },
  { name: "Nigeria", code: "NG", detail: "Startups, fellowships and development grants" },
  { name: "Benin", code: "BJ", detail: "Agriculture, youth and community initiatives" },
] as const;
const steps = [
  { number: "01", icon: Search, title: "Discover", copy: "Browse credible opportunities, compare the essentials, and focus your energy where it has the strongest chance to matter." },
  { number: "02", icon: FilePenLine, title: "Prepare", copy: "Turn requirements into a clear plan, shape a persuasive proposal, and keep every important detail in one place." },
  { number: "03", icon: ShieldCheck, title: "Get Support", copy: "Request professional review or hands-on application support when you need an experienced second pair of eyes." },
];

function CurrentYear() {
  use(io());
  return new Date().getFullYear();
}

export function Homepage({ opportunityShowcase }: { opportunityShowcase: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !root.current) return;
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
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="EasyGrantPath home"><Image src="/logo.png" alt="" width={156} height={52} priority /></Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <a href="#opportunities">Opportunities</a><a href="#how-it-works">How it works</a><a href="#support">Support</a><a href="#countries">Countries</a>
        </nav>
        <div className={styles.headerActions}><Link href="/sign-in" className={styles.textLink}>Sign in</Link><Link href="/sign-up" className={styles.headerCta}>Create account <ArrowRight aria-hidden="true" /></Link></div>
        <details className={styles.mobileMenu}><summary aria-label="Open navigation"><Menu /></summary><nav aria-label="Mobile navigation"><a href="#opportunities">Opportunities</a><a href="#how-it-works">How it works</a><a href="#support">Support</a><a href="#countries">Countries</a><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></nav></details>
      </header>

      <main id="main-content">
        <section className={styles.hero} data-hero>
          <div className={styles.heroTexture} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow} data-hero-copy><span /> Opportunity, made navigable</p>
            <h1>{["Your Ambition", "Deserves an", "Opportunity."].map((line) => <span className={styles.heroLine} key={line}><span data-hero-word>{line}</span></span>)}</h1>
            <p className={styles.heroCopy} data-hero-copy>Discover grants, scholarships, fellowships, and funding opportunities across Africa. Find the right opportunity and get expert support to pursue it.</p>
            <div className={styles.heroActions} data-hero-actions>
              <Link href="/dashboard/opportunities" className={styles.primaryButton}>Explore Opportunities <ArrowRight aria-hidden="true" /></Link>
              <a href="#how-it-works" className={styles.secondaryButton}>How It Works <ArrowDown aria-hidden="true" /></a>
            </div>
          </div>
          <div className={styles.heroVisual} data-hero-visual>
            <div className={styles.heroImage} data-parallax><Image src="/home/hero.jpg" alt="A Nigerian entrepreneur working at her laptop in a modern Lagos office" fill priority sizes="(max-width: 767px) 100vw, 54vw" /></div>
            <div className={styles.heroNote}><Sparkles aria-hidden="true" /><span><strong>Made for momentum</strong>From discovery to a stronger submission.</span></div>
            <p className={styles.photoCredit}>Lagos, Nigeria · Photo via Pexels</p>
          </div>
          <a href="#mission" className={styles.scrollCue} aria-label="Scroll to our mission"><span>Scroll to explore</span><i /></a>
        </section>

        <section id="mission" className={styles.mission}>
          <div className={styles.sectionNumber}>01 / Our purpose</div>
          <div className={styles.missionGrid}>
            <h2 data-reveal>Opportunity exists.<br /><em>Finding the right one changes everything.</em></h2>
            <div data-reveal><p className={styles.missionLead}>Across West Africa, ambitious people are building, researching, learning, and solving difficult problems. Too often, the right funding remains hard to find—and even harder to pursue.</p><p>EasyGrantPath brings credible opportunities, practical preparation tools, and human expertise into one clear path. So more good ideas can move from potential to progress.</p></div>
          </div>
        </section>

        <section id="opportunities" className={styles.opportunities}>
          <div className={styles.sectionHeading} data-reveal><div><p className={styles.kicker}>Open doors</p><h2>Opportunities worth<br />your attention.</h2></div><p>Curated from trusted sources and presented with the details you need to decide what comes next.</p></div>
          {opportunityShowcase}
          <div className={styles.centerAction} data-reveal><Link href="/dashboard/opportunities" className={styles.underlinedLink}>Explore all opportunities <ArrowRight aria-hidden="true" /></Link></div>
        </section>

        <section id="how-it-works" className={styles.process} data-process>
          <div className={styles.processVisual}><Image src="/home/collaboration.jpg" alt="A team of African professionals collaborating in an office" fill sizes="(max-width: 1023px) 100vw, 45vw" /><div className={styles.processOverlay}><p>One clear path.</p><span>Opportunity becomes more useful when you know what to do next.</span></div></div>
          <div className={styles.processContent}>
            <p className={styles.kicker}>How it works</p><h2>From possibility<br />to a prepared plan.</h2>
            <div className={styles.progressLines}>{steps.map((step, index) => <span key={step.number}><i data-process-line={index} /></span>)}</div>
            <div className={styles.processCards}>{steps.map(({ number, icon: Icon, title, copy }) => <article data-process-card key={number}><div className={styles.stepTop}><span>{number}</span><Icon aria-hidden="true" /></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
          </div>
        </section>

        <section id="countries" className={styles.countries}>
          <div className={styles.countryIntro} data-reveal><p className={styles.kicker}>Regional by design</p><h2>Explore<br /><em>West Africa.</em></h2><p>Start where you are. Discover funding relevant to your country, your work, and the communities you want to serve.</p></div>
          <div className={styles.mapWrap} data-reveal><svg viewBox="0 0 620 440" role="img"><title>Stylised map of West Africa</title><path d="M104 77 258 42l183 59 77 104-23 148-151 54-139-39-81-97-43-106Z" /><path className={styles.mapRiver} d="M329 79c-20 78 54 108 19 173-22 41-12 86 29 122" /><circle cx="385" cy="233" r="10" /><circle cx="322" cy="248" r="8" /><circle cx="248" cy="201" r="8" /><circle cx="405" cy="286" r="8" /><circle cx="427" cy="264" r="7" /><text x="407" y="226">Nigeria</text><text x="274" y="278">Ghana</text><text x="188" y="190">Senegal</text><text x="438" y="289">Benin</text><text x="294" y="221">Côte d’Ivoire</text></svg><span>Atlantic Ocean</span></div>
          <div className={styles.countryList} data-reveal>{countries.map((country, index) => <Link href={`/dashboard/opportunities?country=${encodeURIComponent(country.name)}`} key={country.code}><span className={styles.countryIndex}>0{index + 1}</span><span><strong>{country.name}</strong><small>{country.detail}</small></span><ChevronRight aria-hidden="true" /></Link>)}</div>
        </section>

        <section id="support" className={styles.support}>
          <div className={styles.supportImage} data-reveal><Image src="/home/technology.jpg" alt="Two professionals reviewing work together" fill sizes="(max-width: 767px) 100vw, 44vw" /><span>Clarity changes the quality of every application.</span></div>
          <div className={styles.supportContent} data-reveal><p className={styles.kicker}>Professional assistance</p><h2>You do the dreaming.<br /><em>We help with the detail.</em></h2><p>When an application matters, you should not have to untangle every requirement alone. EasyGrantPath can help you organise a proposal, review your draft, and prepare a more complete submission.</p><ul><li><Check aria-hidden="true" /> Guided proposal preparation</li><li><Check aria-hidden="true" /> Professional document review</li><li><Check aria-hidden="true" /> Full application assistance</li></ul><div className={styles.supportNotice}><ShieldCheck aria-hidden="true" /><p><strong>Independent and transparent.</strong> EasyGrantPath is not a grant provider and cannot guarantee funding. Support services improve preparation; decisions always remain with the funder.</p></div><Link href="/sign-up" className={styles.underlinedLink}>See how we support applicants <ArrowRight aria-hidden="true" /></Link></div>
        </section>

        <section className={styles.finalCta}>
          <Image src="/home/enterprise.jpg" alt="African entrepreneurs in conversation" fill sizes="100vw" />
          <div className={styles.finalShade} />
          <div className={styles.finalContent} data-reveal><p className={styles.eyebrow}><span /> Your next move</p><h2>Your Next Opportunity<br />Starts Here.</h2><p>Find a credible place to begin—and the support to keep going.</p><div><Link href="/dashboard/opportunities" className={styles.lightButton}>Explore Opportunities <ArrowRight aria-hidden="true" /></Link><Link href="/sign-up" className={styles.ghostButton}>Create your free account</Link></div></div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}><div><Image src="/logo.png" alt="EasyGrantPath" width={170} height={57} /><p>Credible opportunity discovery and application support for ambitious people across West Africa.</p></div><nav aria-label="Explore"><strong>Explore</strong><Link href="/dashboard/opportunities">Opportunities</Link><a href="#countries">Countries</a><a href="#how-it-works">How it works</a></nav><nav aria-label="Account"><strong>Account</strong><Link href="/sign-up">Create account</Link><Link href="/sign-in">Sign in</Link><Link href="/dashboard">Dashboard</Link></nav><nav aria-label="Support"><strong>Support</strong><a href="#support">Application support</a><Link href="/dashboard/proposals">Proposal tools</Link><Link href="/contact">Contact</Link></nav></div>
        <div className={styles.footerBottom}><span>© <Suspense fallback={null}><CurrentYear /></Suspense> EasyGrantPath</span><span>Built for opportunity across West Africa.</span></div>
      </footer>
    </div>
  );
}
