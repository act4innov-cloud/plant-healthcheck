const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/database');

// ============================================================================
// GET /api/v1/equipments - Liste tous les équipements avec filtres
// ============================================================================
router.get('/', [
  query('status').optional().isIn(['operational', 'maintenance', 'critical', 'outOfService']),
  query('category').optional().isString(),
  query('building').optional().isString(),
  query('zone').optional().isString(),
  query('criticality').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      status,
      category,
      building,
      zone,
      criticality,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    // Construction de la requête SQL dynamique
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (building) {
      whereConditions.push(`building = $${paramIndex}`);
      queryParams.push(building);
      paramIndex++;
    }

    if (zone) {
      whereConditions.push(`zone = $${paramIndex}`);
      queryParams.push(zone);
      paramIndex++;
    }

    if (criticality) {
      whereConditions.push(`criticality_level = $${paramIndex}`);
      queryParams.push(criticality);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        name ILIKE $${paramIndex} OR 
        id ILIKE $${paramIndex} OR 
        type ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Requête pour les équipements
    const equipmentsQuery = `
      SELECT 
        id, name, type, category, manufacturer, model,
        building, zone, floor, status, health_score,
        install_date, last_maintenance_date, next_maintenance_date,
        maintenance_frequency, criticality_level, critical_gases,
        responsible_person, contact_email, notes,
        created_at, updated_at
      FROM equipments
      ${whereClause}
      ORDER BY 
        CASE status
          WHEN 'critical' THEN 1
          WHEN 'maintenance' THEN 2
          WHEN 'operational' THEN 3
          WHEN 'outOfService' THEN 4
        END,
        health_score ASC,
        next_maintenance_date ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    // Requête pour le total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM equipments
      ${whereClause}
    `;

    const [equipmentsResult, countResult] = await Promise.all([
      pool.query(equipmentsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: equipmentsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/equipments/:id - Détails d'un équipement
// ============================================================================
router.get('/:id', [
  param('id').isString().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Récupérer l'équipement
    const equipmentQuery = `
      SELECT 
        id, name, type, category, manufacturer, model, serial_number,
        building, zone, floor, coordinates, status, health_score,
        install_date, warranty_expiry_date, last_maintenance_date, next_maintenance_date,
        maintenance_frequency, operating_hours, criticality_level,
        critical_gases, safety_equipment, specifications,
        responsible_person, contact_email, contact_phone,
        documents, notes, created_at, updated_at
      FROM equipments
      WHERE id = $1
    `;

    const equipmentResult = await pool.query(equipmentQuery, [id]);

    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    const equipment = equipmentResult.rows[0];

    // Récupérer les 5 dernières checklists
    const checklistsQuery = `
      SELECT 
        id, template_id, inspector_name, completed_at,
        score, final_status, next_check_date
      FROM checklists
      WHERE equipment_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 5
    `;

    const checklistsResult = await pool.query(checklistsQuery, [id]);

    // Récupérer les alertes actives
    const alertsQuery = `
      SELECT id, alert_type, severity, title, message, created_at
      FROM alerts
      WHERE equipment_id = $1 AND status = 'active'
      ORDER BY severity DESC, created_at DESC
    `;

    const alertsResult = await pool.query(alertsQuery, [id]);

    // Récupérer l'historique de maintenance
    const maintenanceQuery = `
      SELECT 
        id, maintenance_type, description, start_date, end_date,
        performed_by, status, cost, downtime_hours
      FROM maintenance_history
      WHERE equipment_id = $1
      ORDER BY start_date DESC
      LIMIT 10
    `;

    const maintenanceResult = await pool.query(maintenanceQuery, [id]);

    res.json({
      success: true,
      data: {
        equipment,
        recentChecklists: checklistsResult.rows,
        activeAlerts: alertsResult.rows,
        maintenanceHistory: maintenanceResult.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/v1/equipments - Créer un nouvel équipement
// ============================================================================
router.post('/', [
  body('id').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('type').isString().notEmpty(),
  body('category').isString().notEmpty(),
  body('building').isString().notEmpty(),
  body('zone').isString().notEmpty(),
  body('status').isIn(['operational', 'maintenance', 'critical', 'outOfService']),
  body('healthScore').optional().isInt({ min: 0, max: 100 }),
  body('criticalityLevel').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      id, name, type, category, manufacturer, model, serialNumber,
      building, zone, floor, coordinates, status, healthScore,
      installDate, warrantyExpiryDate, maintenanceFrequency,
      criticalityLevel, criticalGases, safetyEquipment,
      specifications, responsiblePerson, contactEmail, contactPhone,
      notes
    } = req.body;

    const insertQuery = `
      INSERT INTO equipments (
        id, name, type, category, manufacturer, model, serial_number,
        building, zone, floor, coordinates, status, health_score,
        install_date, warranty_expiry_date, maintenance_frequency,
        criticality_level, critical_gases, safety_equipment,
        specifications, responsible_person, contact_email, contact_phone,
        notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      ) RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      id, name, type, category, manufacturer, model, serialNumber,
      building, zone, floor, coordinates ? JSON.stringify(coordinates) : null,
      status, healthScore || 100, installDate, warrantyExpiryDate,
      maintenanceFrequency, criticalityLevel || 'medium',
      criticalGases || [], safetyEquipment || [],
      specifications ? JSON.stringify(specifications) : null,
      responsiblePerson, contactEmail, contactPhone, notes,
      req.user.id // De l'auth middleware
    ]);

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
      VALUES ($1, 'equipment_created', 'equipment', $2, $3)
    `, [req.user.id, id, JSON.stringify({ created: result.rows[0] })]);

    res.status(201).json({
      success: true,
      message: 'Equipment created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Equipment ID already exists'
      });
    }
    next(error);
  }
});

// ============================================================================
// PUT /api/v1/equipments/:id - Mettre à jour un équipement
// ============================================================================
router.put('/:id', [
  param('id').isString().notEmpty(),
  body('name').optional().isString(),
  body('status').optional().isIn(['operational', 'maintenance', 'critical', 'outOfService']),
  body('healthScore').optional().isInt({ min: 0, max: 100 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Vérifier si l'équipement existe
    const checkQuery = 'SELECT * FROM equipments WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    const oldData = checkResult.rows[0];

    // Construction dynamique de la requête UPDATE
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'type', 'category', 'manufacturer', 'model', 'serial_number',
      'building', 'zone', 'floor', 'coordinates', 'status', 'health_score',
      'install_date', 'warranty_expiry_date', 'last_maintenance_date',
      'next_maintenance_date', 'maintenance_frequency', 'operating_hours',
      'criticality_level', 'critical_gases', 'safety_equipment',
      'specifications', 'responsible_person', 'contact_email',
      'contact_phone', 'documents', 'notes'
    ];

    Object.keys(req.body).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        let value = req.body[key];
        
        // Handle JSON fields
        if (['coordinates', 'specifications'].includes(snakeKey) && value) {
          value = JSON.stringify(value);
        }
        
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    queryParams.push(id);

    const updateQuery = `
      UPDATE equipments
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, queryParams);

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
      VALUES ($1, 'equipment_updated', 'equipment', $2, $3)
    `, [
      req.user.id,
      id,
      JSON.stringify({ before: oldData, after: result.rows[0] })
    ]);

    res.json({
      success: true,
      message: 'Equipment updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/v1/equipments/:id - Supprimer un équipement
// ============================================================================
router.delete('/:id', [
  param('id').isString().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Vérifier le rôle (seuls admin et manager peuvent supprimer)
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete equipment'
      });
    }

    const { id } = req.params;

    const deleteQuery = 'DELETE FROM equipments WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
      VALUES ($1, 'equipment_deleted', 'equipment', $2, $3)
    `, [req.user.id, id, JSON.stringify({ deleted: result.rows[0] })]);

    res.json({
      success: true,
      message: 'Equipment deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/equipments/:id/health-history - Historique du score de santé
// ============================================================================
router.get('/:id/health-history', [
  param('id').isString().notEmpty(),
  query('period').optional().isIn(['7d', '30d', '90d', '6m', '1y'])
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    // Convertir la période en jours
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '6m': 180,
      '1y': 365
    };

    const days = periodMap[period];

    const query = `
      SELECT 
        DATE(completed_at) as date,
        AVG(score) as avg_score,
        COUNT(*) as num_inspections
      FROM checklists
      WHERE equipment_id = $1
        AND status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      data: result.rows,
      period,
      days
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
