import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Compass } from "lucide-react";
import styles from "./homepage.module.css";

export type HomepageOpportunity = {
  id: string;
  slug: string;
  title: string;
  organization: string;
  type: string;
  location: string;
  sector: string;
  funding: string;
  deadline: string;
};

const photos = ["/home/collaboration.jpg", "/home/technology.jpg", "/home/research.jpg", "/home/enterprise.jpg"];

export function OpportunityShowcase({ opportunities }: { opportunities: HomepageOpportunity[] }) {
  const t = useTranslations("Home.showcase");
  const navigation = useTranslations("Navigation");
  if (!opportunities.length) {
    return (
      <div className={styles.emptyOpportunities}>
        <Compass aria-hidden="true" />
        <div><h3>{t("emptyTitle")}</h3><p>{t("emptyDescription")}</p></div>
        <Link href="/sign-up">{navigation("createAccount")} <ArrowRight aria-hidden="true" /></Link>
      </div>
    );
  }

  return (
    <div className={styles.opportunityGrid}>
      {opportunities.map((item, index) => (
        <article className={styles.opportunityCard} key={item.id}>
          <Link href={`/dashboard/opportunities/${item.slug}`} className={styles.cardImage} aria-label={t("arrowLabel", { title: item.title })}>
            <Image src={photos[index % photos.length]} alt="" fill sizes="(max-width: 767px) 100vw, 50vw" />
          </Link>
          <div className={styles.cardBody}>
            <div className={styles.cardMeta}><span>{item.type}</span><span>{item.location}</span></div>
            <h3><Link href={`/dashboard/opportunities/${item.slug}`}>{item.title}</Link></h3>
            <p className={styles.organization}>{item.organization}</p>
            <dl><div><dt>{t("focus")}</dt><dd>{item.sector}</dd></div><div><dt>{t("funding")}</dt><dd>{item.funding}</dd></div><div><dt>{t("deadline")}</dt><dd>{item.deadline}</dd></div></dl>
            <Link href={`/dashboard/opportunities/${item.slug}`} className={styles.cardLink}>{t("viewOpportunity")} <ArrowRight aria-hidden="true" /></Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function OpportunityShowcaseSkeleton() {
  const t = useTranslations("Home.showcase");
  return (
    <div className={styles.opportunityGrid} aria-label={t("loading")} aria-busy="true">
      {[0, 1, 2, 3].map((item) => (
        <div className={styles.skeletonCard} key={item} aria-hidden="true">
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonBody}><span /><span /><span /></div>
        </div>
      ))}
    </div>
  );
}
