import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { dbQuery } from "../db";

export const getSyncMetrics: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  try {
    const totalJobs = await dbQuery<{ count: number }>(`select count(*)::int as count from sync_jobs where user_id = $1`, [userId]);
    const successJobs = await dbQuery<{ count: number }>(`select count(*)::int as count from sync_jobs where user_id = $1 and status = 'success'`, [userId]);
    const failedJobs = await dbQuery<{ count: number }>(`select count(*)::int as count from sync_jobs where user_id = $1 and status = 'failed'`, [userId]);
    
    const history = await dbQuery(
      `select id, source, destination, status, stats, created_at, finished_at 
       from sync_jobs 
       where user_id = $1 
       order by created_at desc 
       limit 10`,
      [userId]
    );

    const globalEvals = await dbQuery<{ avg_score: number; total_evals: number }>(
      `select 
         coalesce(avg(computed_score), 0)::numeric(5,2) as avg_score,
         count(*)::int as total_evals
       from academic_evaluations`
    );

    res.status(200).json({
      metrics: {
        total: totalJobs.rows[0]?.count || 0,
        success: successJobs.rows[0]?.count || 0,
        failed: failedJobs.rows[0]?.count || 0,
      },
      academic: {
        globalAverage: Number(globalEvals.rows[0]?.avg_score || 0),
        totalEvaluations: globalEvals.rows[0]?.total_evals || 0,
      },
      history: history.rows
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Falha ao obter telemetria." });
  }
};

export const saveAcademicEvaluation: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  const { q1, q2, q3, q4, computedScore } = req.body;
  if (q1 === undefined || q2 === undefined || q3 === undefined || q4 === undefined || computedScore === undefined) {
    return res.status(400).json({ error: "Dados da avaliação incompletos." });
  }

  try {
    await dbQuery(
      `insert into academic_evaluations(user_id, q1_utility, q2_usability, q3_frequency, q4_complexity, computed_score)
       values ($1, $2, $3, $4, $5, $6)`,
      [userId, q1, q2, q3, q4, computedScore]
    );
    res.status(200).json({ status: "success" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao salvar avaliação acadêmica no banco." });
  }
};