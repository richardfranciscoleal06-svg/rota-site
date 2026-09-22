import { getSupabaseClient } from './lib/supabase';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(_request: Request): Promise<Response> {
  const client = getSupabaseClient();

  const [membersResult, patrolsResult, reportsResult] = await Promise.all([
    client.from('members').select('status, horas_patrulha, apreensoes_rs').eq('status', 'ATIVO'),
    client.from('patrol_sessions').select('id, status').eq('status', 'ativa'),
    client.from('rso_reports').select('armamento, drogas, municoes, bombas, dinheiro_marcado, detidos, ocorrencias, created_at'),
  ]);

  if (membersResult.error || patrolsResult.error || reportsResult.error) {
    return json({ error: 'Não foi possível carregar estatísticas.' }, 500);
  }

  const members = membersResult.data ?? [];
  const patrols = patrolsResult.data ?? [];
  const reports = reportsResult.data ?? [];

  const totalDrogas = reports.reduce((sum, report) => sum + Number(report.drogas ?? 0), 0);
  const totalArmamento = reports.reduce((sum, report) => sum + Number(report.armamento ?? 0), 0);
  const totalMunicoes = reports.reduce((sum, report) => sum + Number(report.municoes ?? 0), 0);
  const totalBombas = reports.reduce((sum, report) => sum + Number(report.bombas ?? 0), 0);
  const totalDinheiro = reports.reduce((sum, report) => sum + Number(report.dinheiro_marcado ?? 0), 0);
  const totalDetidos = reports.reduce((sum, report) => sum + Number(report.detidos ?? 0), 0);
  const totalOcorrencias = reports.reduce((sum, report) => sum + Number(report.ocorrencias ?? 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReports = reports.filter((report) => new Date(report.created_at) >= monthStart);

  return json({
    drogas: totalDrogas,
    armamento: totalArmamento,
    municoes: totalMunicoes,
    bombas: totalBombas,
    dinheiroMarcado: totalDinheiro,
    operadoresAtivos: members.length,
    viaturasAtivas: patrols.length,
    ocorrenciasMes: monthReports.reduce((sum, report) => sum + Number(report.ocorrencias ?? 0), 0),
    patrulhasMes: monthReports.length,
    detidosMes: monthReports.reduce((sum, report) => sum + Number(report.detidos ?? 0), 0),
    tendencias: {
      ocorrenciasMes: null,
      patrulhasMes: null,
      detidosMes: null,
    },
    ultimaAtualizacao: reports.length ? new Date(Math.max(...reports.map((report) => new Date(report.created_at).getTime()))).toISOString() : null,
  });
}
