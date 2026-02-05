const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/database');

// ============================================================================
// GET /api/v1/checklists - Liste des checklists
// ============================================================================
router.get('/', [
  query('equipmentId').optional().isString(),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  query('finalStatus').optional().isIn(['conforme', 'à_vérifier', 'critique', 'en_attente']),
  query('inspectorId').optional().isUUID(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      equipmentId,
      status,
      finalStatus,
      inspectorId,
      from,
      to,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (equipmentId) {
      whereConditions.push(`c.equipment_id = $${paramIndex}`);
      queryParams.push(equipmentId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (finalStatus) {
      whereConditions.push(`c.final_status = $${paramIndex}`);
      queryParams.push(finalStatus);
      paramIndex++;
    }

    if (inspectorId) {
      whereConditions.push(`c.inspector_id = $${paramIndex}`);
      queryParams.push(inspectorId);
      paramIndex++;
    }

    if (from) {
      whereConditions.push(`c.completed_at >= $${paramIndex}`);
      queryParams.push(from);
      paramIndex++;
    }

    if (to) {
      whereConditions.push(`c.completed_at <= $${paramIndex}`);
      queryParams.push(to);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const checklistsQuery = `
      SELECT 
        c.id, c.equipment_id, c.template_id, c.inspector_id, c.inspector_name,
        c.scheduled_date, c.started_at, c.completed_at, c.status,
        c.total_items, c.completed_items, c.passed_items, c.failed_items,
        c.score, c.final_status, c.next_check_date, c.inspector_notes,
        e.name as equipment_name, e.type as equipment_type,
        e.building, e.zone, e.status as equipment_status,
        t.title as template_title
      FROM checklists c
      JOIN equipments e ON c.equipment_id = e.id
      JOIN checklist_templates t ON c.template_id = t.id
      ${whereClause}
      ORDER BY c.completed_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM checklists c
      ${whereClause}
    `;

    const [checklistsResult, countResult] = await Promise.all([
      pool.query(checklistsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: checklistsResult.rows,
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
// GET /api/v1/checklists/templates - Templates de checklists
// ============================================================================
router.get('/templates', [
  query('equipmentType').optional().isString(),
  query('isActive').optional().isBoolean()
], async (req, res, next) => {
  try {
    const { equipmentType, isActive } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (equipmentType) {
      whereConditions.push(`equipment_type = $${paramIndex}`);
      queryParams.push(equipmentType);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        id, equipment_type, title, description, version,
        frequency, estimated_duration, required_certifications,
        required_ppe, sections, scoring_rules, is_active,
        created_at, updated_at
      FROM checklist_templates
      ${whereClause}
      ORDER BY equipment_type, title
    `;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/checklists/templates/:id - Détails d'un template
// ============================================================================
router.get('/templates/:id', [
  param('id').isString().notEmpty()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM checklist_templates WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/checklists/:id - Détails d'une checklist
// ============================================================================
router.get('/:id', [
  param('id').isInt().toInt()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.*,
        e.name as equipment_name, e.type as equipment_type,
        e.building, e.zone, e.criticality_level,
        t.title as template_title, t.sections as template_sections
      FROM checklists c
      JOIN equipments e ON c.equipment_id = e.id
      JOIN checklist_templates t ON c.template_id = t.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/v1/checklists - Créer une nouvelle checklist
// ============================================================================
router.post('/', [
  body('equipmentId').isString().notEmpty(),
  body('templateId').isString().notEmpty(),
  body('scheduledDate').optional().isISO8601()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { equipmentId, templateId, scheduledDate } = req.body;

    // Vérifier que l'équipement existe
    const equipmentCheck = await pool.query(
      'SELECT id, category FROM equipments WHERE id = $1',
      [equipmentId]
    );

    if (equipmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    // Vérifier que le template existe et correspond au type d'équipement
    const templateCheck = await pool.query(
      'SELECT id, equipment_type, sections FROM checklist_templates WHERE id = $1',
      [templateId]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const template = templateCheck.rows[0];
    const equipment = equipmentCheck.rows[0];

    if (template.equipment_type !== equipment.category) {
      return res.status(400).json({
        success: false,
        error: `Template type (${template.equipment_type}) does not match equipment category (${equipment.category})`
      });
    }

    // Créer la checklist
    const insertQuery = `
      INSERT INTO checklists (
        equipment_id, template_id, inspector_id, inspector_name,
        scheduled_date, status, responses, total_items
      ) VALUES ($1, $2, $3, $4, $5, 'pending', '{}', $6)
      RETURNING *
    `;

    // Calculer le nombre total d'items
    const sections = template.sections;
    let totalItems = 0;
    sections.forEach(section => {
      totalItems += section.items.length;
    });

    const result = await pool.query(insertQuery, [
      equipmentId,
      templateId,
      req.user.id,
      req.user.display_name,
      scheduledDate || new Date().toISOString().split('T')[0],
      totalItems
    ]);

    res.status(201).json({
      success: true,
      message: 'Checklist created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/v1/checklists/:id - Mettre à jour une checklist (en cours)
// ============================================================================
router.put('/:id', [
  param('id').isInt().toInt(),
  body('responses').optional().isObject(),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('inspectorNotes').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { responses, status, inspectorNotes } = req.body;

    // Récupérer la checklist actuelle
    const checkQuery = `
      SELECT c.*, t.sections, t.scoring_rules
      FROM checklists c
      JOIN checklist_templates t ON c.template_id = t.id
      WHERE c.id = $1
    `;

    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist not found'
      });
    }

    const checklist = checkResult.rows[0];

    // Vérifier que l'utilisateur est l'inspecteur ou un admin
    if (checklist.inspector_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this checklist'
      });
    }

    // Fusionner les réponses
    const updatedResponses = {
      ...checklist.responses,
      ...responses
    };

    // Calculer le score si statut = completed
    let score = null;
    let finalStatus = null;
    let completedItems = 0;
    let passedItems = 0;
    let failedItems = 0;
    let completedAt = checklist.completed_at;
    let nextCheckDate = checklist.next_check_date;

    if (status === 'completed') {
      const sections = checklist.sections;
      const scoringRules = checklist.scoring_rules;

      sections.forEach(section => {
        section.items.forEach(item => {
          if (updatedResponses[item.id]) {
            completedItems++;

            const response = updatedResponses[item.id];
            let passed = false;

            switch (item.type) {
              case 'boolean':
                passed = response.value === true;
                break;
              case 'number':
                if (item.range) {
                  passed = response.value >= item.range.min && response.value <= item.range.max;
                } else {
                  passed = true;
                }
                break;
              case 'select':
                const selectedOption = item.options.find(opt => opt.value === response.value);
                passed = selectedOption && selectedOption.acceptable !== false;
                break;
              case 'textarea':
              case 'file':
                passed = true;
                break;
            }

            if (passed) {
              passedItems++;
            } else {
              failedItems++;
            }
          }
        });
      });

      score = completedItems > 0 ? (passedItems / completedItems) * 100 : 0;

      // Déterminer le statut final
      if (score >= 90) finalStatus = 'conforme';
      else if (score >= 75) finalStatus = 'à_vérifier';
      else if (score >= 50) finalStatus = 'critique';
      else finalStatus = 'en_attente';

      completedAt = new Date().toISOString();

      // Calculer next_check_date basé sur la fréquence
      const template = await pool.query(
        'SELECT frequency FROM checklist_templates WHERE id = $1',
        [checklist.template_id]
      );

      const frequency = template.rows[0].frequency;
      const nextDate = new Date();

      switch (frequency) {
        case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
        case 'semiannual': nextDate.setMonth(nextDate.getMonth() + 6); break;
        case 'annual': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        default: nextDate.setMonth(nextDate.getMonth() + 1);
      }

      nextCheckDate = nextDate.toISOString().split('T')[0];
    }

    // Mettre à jour la checklist
    const updateQuery = `
      UPDATE checklists
      SET 
        responses = $1,
        status = $2,
        inspector_notes = $3,
        completed_items = $4,
        passed_items = $5,
        failed_items = $6,
        score = $7,
        final_status = $8,
        completed_at = $9,
        next_check_date = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedResponses),
      status || checklist.status,
      inspectorNotes || checklist.inspector_notes,
      completedItems,
      passedItems,
      failedItems,
      score,
      finalStatus,
      completedAt,
      nextCheckDate,
      id
    ]);

    // Si completed, mettre à jour l'équipement
    if (status === 'completed') {
      await pool.query(`
        UPDATE equipments
        SET 
          last_maintenance_date = $1,
          next_maintenance_date = $2,
          health_score = calculate_equipment_health_score(id)
        WHERE id = $3
      `, [completedAt.split('T')[0], nextCheckDate, checklist.equipment_id]);

      // Créer une alerte si score faible
      if (score < 60) {
        await pool.query(`
          INSERT INTO alerts (
            equipment_id, checklist_id, alert_type, severity,
            title, message, status
          ) VALUES ($1, $2, 'health_score_low', 'high', $3, $4, 'active')
        `, [
          checklist.equipment_id,
          id,
          `Score faible - ${checklist.equipment_id}`,
          `L'inspection a révélé un score de ${score.toFixed(1)}%. Vérification requise.`
        ]);
      }
    }

    res.json({
      success: true,
      message: 'Checklist updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/v1/checklists/:id - Supprimer une checklist
// ============================================================================
router.delete('/:id', [
  param('id').isInt().toInt()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    // Seuls admin et manager peuvent supprimer
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const result = await pool.query(
      'DELETE FROM checklists WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist not found'
      });
    }

    res.json({
      success: true,
      message: 'Checklist deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
