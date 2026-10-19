import { Link } from "react-router-dom";
import { useTranslation } from "@/lib/i18n-context";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-background">
      <div className="container py-6 text-xs text-muted-foreground flex flex-col gap-3 sm:flex-row items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Collab2Us.</p>
          <span className="hidden sm:inline">•</span>
          <p>
            {t("footer_developed_by")}{" "}
            <strong className="text-foreground font-semibold">Pedro Lucas Dornelles dos Santos</strong>
            {" "}&bull;{" "}
            {t("footer_advised_by")}{" "}
            <strong className="text-foreground font-semibold">Prof. Dr. Rafael Baldiati Parizi</strong>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <p className="hidden md:inline">{t("footer_tagline")}</p>
          <span className="hidden md:inline">•</span>
          <Link to="/references" className="hover:underline text-primary font-medium">
            {t("footer_references")}
          </Link>
        </div>
      </div>
    </footer>
  );
}