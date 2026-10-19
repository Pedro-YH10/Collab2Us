import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Award, CheckCircle2, GitCompare } from "lucide-react";
import { useTranslation } from "@/lib/i18n-context";

export default function References() {
  const { t } = useTranslation();

  const concepts = [
    {
      title: t("ref_qus_title"),
      author: "Lucassen et al. (2016)",
      icon: Award,
      desc: t("ref_qus_desc"),
      details: [
        t("ref_qus_d1"),
        t("ref_qus_d2"),
        t("ref_qus_d3")
      ]
    },
    {
      title: t("ref_invest_title"),
      author: "Bill Wake (2003)",
      icon: CheckCircle2,
      desc: t("ref_invest_desc"),
      details: [
        t("ref_invest_d1"),
        t("ref_invest_d2"),
        t("ref_invest_d3"),
        t("ref_invest_d4"),
        t("ref_invest_d5"),
        t("ref_invest_d6")
      ]
    },
    {
      title: t("ref_connextra_title"),
      author: "Rachel Davies (2001)",
      icon: BookOpen,
      desc: t("ref_connextra_desc"),
      details: [
        t("ref_connextra_d1"),
        t("ref_connextra_d2"),
        t("ref_connextra_d3")
      ]
    },
    {
      title: t("ref_dualtrack_title"),
      author: "Inayat et al. (2015); Hehn & Uebernickel (2018)",
      icon: GitCompare,
      desc: t("ref_dualtrack_desc"),
      details: [
        t("ref_dualtrack_d1"),
        t("ref_dualtrack_d2")
      ]
    }
  ];

  return (
    <div className="container py-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("ref_title")}</h1>
        <p className="text-xs text-muted-foreground mt-1">{t("ref_subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {concepts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card key={idx} className="shadow-xs border hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Icon className="h-4 w-4" /> {item.title}
                </CardTitle>
                <CardDescription className="text-[11px] font-semibold text-muted-foreground">
                  Reference: {item.author}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed">
                <p className="text-muted-foreground">{item.desc}</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-foreground font-medium bg-muted/20 p-2.5 rounded border">
                  {item.details.map((detail, dIdx) => (
                    <li key={dIdx}>{detail}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}