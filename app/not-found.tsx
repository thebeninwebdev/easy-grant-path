import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
export const instant = false;
export default async function NotFound() { const t = await getTranslations("Errors.notFound"); return <main className="flex flex-1 items-center justify-center p-6"><div className="space-y-3 text-center"><p className="text-sm font-medium text-muted-foreground">{t("code")}</p><h1 className="text-2xl font-semibold">{t("title")}</h1><Link className="text-sm underline" href="/">{t("returnHome")}</Link></div></main>; }