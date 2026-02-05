const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================================================
// GET /api/v1/dashboard/stats - Statistiques principales du dashboard
// ============================================================================
router.get('/stats', async (req, res, next) => {
  try {
    // Utiliser la vue créée dans le schema
    const statsQuery = 'SELECT * FROM dashboard_stats';
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    // Statistiques des checklists par statut
    const checklistsStatsQuery = `
      SELECT 
        final_status,
        COUNT(*) as count
      FROM checklists
      WHERE status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY final_status
    `;
    const checklistsStats = await pool.query(checklistsStatsQuery);

    // Distribution des équipements par catégorie
    const categoryDistQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        AVG(health_score) as avg_health_score
      FROM equipments
      GROUP BY category
      ORDER BY count DESC
    `;
    const categoryDist = await pool.query(categoryDistQuery);

    // Alertes par sévérité
    const alertsBySeverityQuery = `
      SELECT 
        severity,
        COUNT(*) as count
      FROM alerts
      WHERE status = 'active'
      GROUP BY severity
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;
    const alertsBySeverity = await pool.query(alertsBySeverityQuery);

    // Tendance des inspections (7 derniers jours)
    const inspectionsTrendQuery = `
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as count,
        AVG(score) as avg_score
      FROM checklists
      WHERE status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `;
    const inspectionsTrend = await pool.query(inspectionsTrendQuery);

    // Top 5 équipements avec score le plus bas
    const lowScoreEquipmentsQuery = `
      SELECT 
        id, name, type, building, zone,
        health_score, status, next_maintenance_date
      FROM equipments
      WHERE health_score IS NOT NULL
      ORDER BY health_score ASC
      LIMIT 5
    `;
    const lowScoreEquipments = await pool.query(lowScoreEquipmentsQuery);

    // Calcul du taux de conformité
    const conformityRate = stats.checklists_completed_month > 0
      ? (checklistsStats.rows.find(s => s.final_status === 'conforme')?.count || 0) / 
        stats.checklists_completed_month * 100
      : 0;

    // Comparaison avec le mois dernier
    const lastMonthQuery = `
      SELECT 
        COUNT(*) as total,
        AVG(score) as avg_score
      FROM checklists
      WHERE status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '60 days'
        AND completed_at < CURRENT_DATE - INTERVAL '30 days'
    `;
    const lastMonth = await pool.query(lastMonthQuery);

    const thisMonthAvgScore = checklistsStats.rows.length > 0
      ? await pool.query(`
          SELECT AVG(score) as avg_score
          FROM checklists
          WHERE status = 'completed'
            AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
        `)
      : { rows: [{ avg_score: 0 }] };

    const scoreEvolution = lastMonth.rows[0].avg_score > 0
      ? ((thisMonthAvgScore.rows[0].avg_score - lastMonth.rows[0].avg_score) / lastMonth.rows[0].avg_score * 100)
      : 0;

    const checklistsEvolution = lastMonth.rows[0].total > 0
      ? ((stats.checklists_completed_month - lastMonth.rows[0].total) / lastMonth.rows[0].total * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalEquipments: parseInt(stats.total_equipments),
          operationalEquipments: parseInt(stats.operational_equipments),
          maintenanceEquipments: parseInt(stats.maintenance_equipments),
          criticalEquipments: parseInt(stats.critical_equipments),
          outOfServiceEquipments: parseInt(stats.out_of_service_equipments),
          avgHealthScore: Math.round(parseFloat(stats.avg_health_score)),
          checklistsCompletedMonth: parseInt(stats.checklists_completed_month),
          activeAlerts: parseInt(stats.active_alerts),
          upcomingMaintenanceWeek: parseInt(stats.upcoming_maintenance_week),
          conformityRate: Math.round(conformityRate),
          checklistsEvolution: Math.round(checklistsEvolution),
          scoreEvolution: Math.round(scoreEvolution)
        },
        checklistsByStatus: checklistsStats.rows.reduce((acc, row) => {
          acc[row.final_status] = parseInt(row.count);
          return acc;
        }, {
          conforme: 0,
          à_vérifier: 0,
          critique: 0,
          en_attente: 0
        }),
        equipmentsByCategory: categoryDist.rows.map(row => ({
          category: row.category,
          count: parseInt(row.count),
          avgHealthScore: Math.round(parseFloat(row.avg_health_score || 0))
        })),
        alertsBySeverity: alertsBySeverity.rows.reduce((acc, row) => {
          acc[row.severity] = parseInt(row.count);
          return acc;
        }, {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }),
        inspectionsTrend: inspectionsTrend.rows.map(row => ({
          date: row.date,
          count: parseInt(row.count),
          avgScore: Math.round(parseFloat(row.avg_score))
        })),
        lowScoreEquipments: lowScoreEquipments.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/dashboard/upcoming-inspections - Inspections à venir
// ============================================================================
router.get('/upcoming-inspections', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        e.id as equipment_id,
        e.name as equipment_name,
        e.type as equipment_type,
        e.building,
        e.zone,
        e.next_maintenance_date,
        e.criticality_level,
        e.responsible_person,
        t.id as template_id,
        t.title as template_title,
        t.estimated_duration,
        CASE 
          WHEN e.next_maintenance_date < CURRENT_DATE THEN 'overdue'
          WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'urgent'
          WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
          ELSE 'scheduled'
        END as urgency,
        e.next_maintenance_date - CURRENT_DATE as days_until
      FROM equipments e
      LEFT JOIN checklist_templates t ON t.equipment_type = e.category AND t.is_active = true
      WHERE e.next_maintenance_date IS NOT NULL
        AND e.next_maintenance_date <= CURRENT_DATE + INTERVAL '14 days'
        AND e.status != 'outOfService'
      ORDER BY 
        CASE 
          WHEN e.next_maintenance_date < CURRENT_DATE THEN 1
          WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
          WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 3
          ELSE 4
        END,
        e.next_maintenance_date ASC,
        e.criticality_level DESC
      LIMIT 20
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/dashboard/recent-activity - Activité récente
// ============================================================================
router.get('/recent-activity', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        'checklist_completed' as activity_type,
        c.id as entity_id,
        c.equipment_id,
        e.name as equipment_name,
        c.inspector_name as actor,
        c.completed_at as timestamp,
        c.final_status as status,
        c.score,
        json_build_object(
          'checklistId', c.id,
          'equipmentId', c.equipment_id,
          'equipmentName', e.name,
          'score', c.score,
          'status', c.final_status
        ) as metadata
      FROM checklists c
      JOIN equipments e ON c.equipment_id = e.id
      WHERE c.status = 'completed'
        AND c.completed_at >= CURRENT_DATE - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'alert_created' as activity_type,
        a.id as entity_id,
        a.equipment_id,
        e.name as equipment_name,
        'System' as actor,
        a.created_at as timestamp,
        a.severity as status,
        NULL as score,
        json_build_object(
          'alertId', a.id,
          'alertType', a.alert_type,
          'severity', a.severity,
          'title', a.title
        ) as metadata
      FROM alerts a
      LEFT JOIN equipments e ON a.equipment_id = e.id
      WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'equipment_updated' as activity_type,
        e.id as entity_id,
        e.id as equipment_id,
        e.name as equipment_name,
        'System' as actor,
        e.updated_at as timestamp,
        e.status as status,
        e.health_score as score,
        json_build_object(
          'equipmentId', e.id,
          'status', e.status,
          'healthScore', e.health_score
        ) as metadata
      FROM equipments e
      WHERE e.updated_at >= CURRENT_DATE - INTERVAL '7 days'
        AND e.updated_at != e.created_at
      
      ORDER BY timestamp DESC
      LIMIT 50
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/dashboard/health-trends - Tendances de santé
// ============================================================================
router.get('/health-trends', async (req, res, next) => {
  try {
    // Tendance globale des 30 derniers jours
    const globalTrendQuery = `
      WITH daily_scores AS (
        SELECT 
          DATE(completed_at) as date,
          AVG(score) as avg_score,
          COUNT(*) as num_inspections
        FROM checklists
        WHERE status = 'completed'
          AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(completed_at)
      )
      SELECT 
        date,
        ROUND(avg_score::numeric, 1) as avg_score,
        num_inspections
      FROM daily_scores
      ORDER BY date ASC
    `;

    const globalTrend = await pool.query(globalTrendQuery);

    // Tendances par catégorie d'équipement
    const categoryTrendQuery = `
      SELECT 
        e.category,
        DATE(c.completed_at) as date,
        AVG(c.score) as avg_score,
        COUNT(*) as num_inspections
      FROM checklists c
      JOIN equipments e ON c.equipment_id = e.id
      WHERE c.status = 'completed'
        AND c.completed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY e.category, DATE(c.completed_at)
      ORDER BY e.category, date ASC
    `;

    const categoryTrend = await pool.query(categoryTrendQuery);

    // Grouper par catégorie
    const trendsByCategory = {};
    categoryTrend.rows.forEach(row => {
      if (!trendsByCategory[row.category]) {
        trendsByCategory[row.category] = [];
      }
      trendsByCategory[row.category].push({
        date: row.date,
        avgScore: Math.round(parseFloat(row.avg_score)),
        numInspections: parseInt(row.num_inspections)
      });
    });

    // Distribution des scores
    const scoreDistQuery = `
      SELECT 
        CASE 
          WHEN score >= 90 THEN '90-100'
          WHEN score >= 80 THEN '80-89'
          WHEN score >= 70 THEN '70-79'
          WHEN score >= 60 THEN '60-69'
          ELSE '<60'
        END as score_range,
        COUNT(*) as count
      FROM checklists
      WHERE status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY score_range
      ORDER BY score_range DESC
    `;

    const scoreDist = await pool.query(scoreDistQuery);

    res.json({
      success: true,
      data: {
        globalTrend: globalTrend.rows,
        trendsByCategory,
        scoreDistribution: scoreDist.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/dashboard/alerts-summary - Résumé des alertes
// ============================================================================
router.get('/alerts-summary', async (req, res, next) => {
  try {
    const summaryQuery = `
      SELECT 
        alert_type,
        severity,
        COUNT(*) as count,
        array_agg(
          json_build_object(
            'id', id,
            'equipmentId', equipment_id,
            'title', title,
            'createdAt', created_at
          )
        ) FILTER (WHERE id IS NOT NULL) as recent_alerts
      FROM (
        SELECT 
          id, equipment_id, alert_type, severity, title, created_at,
          ROW_NUMBER() OVER (PARTITION BY alert_type, severity ORDER BY created_at DESC) as rn
        FROM alerts
        WHERE status = 'active'
      ) ranked
      WHERE rn <= 3
      GROUP BY alert_type, severity
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        count DESC
    `;

    const result = await pool.query(summaryQuery);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/dashboard/maintenance-calendar - Calendrier de maintenance
// ============================================================================
router.get('/maintenance-calendar', async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const targetDate = month && year 
      ? `${year}-${month.padStart(2, '0')}-01`
      : new Date().toISOString().split('T')[0];

    const query = `
      SELECT 
        e.id as equipment_id,
        e.name as equipment_name,
        e.type as equipment_type,
        e.building,
        e.zone,
        e.next_maintenance_date as date,
        e.criticality_level,
        e.responsible_person,
        t.title as inspection_type,
        t.estimated_duration
      FROM equipments e
      LEFT JOIN checklist_templates t ON t.equipment_type = e.category AND t.is_active = true
      WHERE e.next_maintenance_date >= DATE_TRUNC('month', DATE '$1')
        AND e.next_maintenance_date < DATE_TRUNC('month', DATE '$1') + INTERVAL '1 month'
        AND e.status != 'outOfService'
      ORDER BY e.next_maintenance_date, e.criticality_level DESC
    `;

    const result = await pool.query(query, [targetDate]);

    // Grouper par jour
    const calendar = {};
    result.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (!calendar[dateStr]) {
        calendar[dateStr] = [];
      }
      calendar[dateStr].push(row);
    });

    res.json({
      success: true,
      data: calendar
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
