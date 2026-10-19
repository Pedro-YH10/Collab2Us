import { useTranslation } from "@/lib/i18n-context";
import { Link } from "react-router-dom";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="container py-20 flex flex-col items-center justify-center text-center space-y-4">
      <h1 className="text-4xl font-extrabold">{t("notfound_title")}</h1>
      <Link to="/" className="text-primary underline underline-offset-4 text-sm font-medium">
        {t("notfound_back")}
      </Link>
    </div>
  );
};

export default NotFound;