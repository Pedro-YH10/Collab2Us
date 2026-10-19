import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n-context";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Activity, Percent } from "lucide-react";
import type { Board } from "@shared/api";

interface Metrics {
  total: number;
  success: number;
  failed: number;
}

interface JobRecord {
  id: string;
  source: string;
  destination: string;
  status: "pending" | "running" | "success" | "failed";
  created_at: string;
  stats: any;
}

interface MemberRecord {
  id: string;
  fullName: string;
  username: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, success: 0, failed: 0 });
  const [history, setHistory] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [trelloBoards, setTrelloBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [boardMembers, setBoardMembers] = useState<MemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  async function loadData() {
    try {
      const [metricsRes, trelloRes] = await Promise.all([
        fetch("/api/convert/metrics", { credentials: "include" }),
        fetch("/api/trello/boards", { credentials: "include" })
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics || { total: 0, success: 0, failed: 0 });
        setHistory(data.history || []);
      }

      if (trelloRes.ok) {
        const trelloData = await trelloRes.json();
        setTrelloBoards(trelloData.boards || []);
      }
    } catch {
      toast.error(t("toast_metrics_load_error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    async function loadMembers() {
      if (!selectedBoardId) {
        setBoardMembers([]);
        return;
      }
      setLoadingMembers(true);
      try {
        const res = await fetch(`/api/trello/boards/${selectedBoardId}/members`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setBoardMembers(data.members || []);
        }
      } catch {
        toast.error(t("toast_members_load_error"));
      } finally {
        setLoadingMembers(false);
      }
    }
    loadMembers();
  }, [selectedBoardId]);

  const successRate = metrics.total > 0 
    ? Math.round((metrics.success / metrics.total) * 100) 
    : 100;

  if (loading) {
    return <div className="container py-20 text-center text-muted-foreground text-xs">{t("db_loading")}</div>;
  }

  return (
    <div className="container py-10 gap-6 flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("db_title")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("db_subtitle")}</p>
      </div>

      {/* Cards Operacionais de Telemetria */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t("db_total_syncs")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{metrics.total}</div>
            <p className="text-[10px] text-muted-foreground">{t("db_total_syncs_desc")}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600">{t("db_success_syncs")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-600">{metrics.success}</div>
            <p className="text-[10px] text-muted-foreground">{t("db_success_syncs_desc")}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-red-600">{t("db_failed_syncs")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-600">{metrics.failed}</div>
            <p className="text-[10px] text-muted-foreground">{t("db_failed_syncs_desc")}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-primary">{t("db_success_rate")}</CardTitle>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-primary">{successRate}%</div>
            <p className="text-[10px] text-muted-foreground">{t("db_success_rate_desc")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Gestão de Membros Trello */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold">{t("db_team_title")}</CardTitle>
            <CardDescription className="text-xs">{t("db_team_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("db_team_audit_label")}</Label>
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("db_team_audit_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {trelloBoards.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 mt-2 max-h-72 overflow-y-auto">
              {boardMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between border rounded-md p-2 bg-accent/20">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{member.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">@{member.username}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">{t("db_team_member_badge") || "Member"}</Badge>
                </div>
              ))}
              {selectedBoardId && boardMembers.length === 0 && !loadingMembers && (
                <p className="text-xs text-muted-foreground text-center py-2">{t("db_team_no_members")}</p>
              )}
              {!selectedBoardId && (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  {t("db_team_select_board")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Histórico Auditável de Sincronizações (Audit Trail) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold">{t("db_history_title")}</CardTitle>
            <CardDescription className="text-xs">{t("db_history_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("db_history_date")}</TableHead>
                  <TableHead className="text-xs">{t("db_history_status")}</TableHead>
                  <TableHead className="text-xs text-right">{t("db_history_cards")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="text-xs">{new Date(job.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className="text-[9px]" variant={job.status === "success" ? "default" : "secondary"}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-right">
                      {job.stats?.created_cards || 0}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">
                      {t("db_history_empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}