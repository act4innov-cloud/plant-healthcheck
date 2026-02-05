const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================================================
// POST /api/v1/reports/checklist/:id - Générer rapport PDF d'une checklist
// ============================================================================
router.post('/checklist/:id', [
  param('id').isInt().toInt()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Récupérer les données de la checklist
    const query = `
      SELECT 
        c.*,
        e.name as equipment_name, e.type as equipment_type,
        e.building, e.zone, e.manufacturer, e.model, e.serial_number,
        e.criticality_level, e.critical_gases, e.responsible_person,
        t.title as template_title, t.sections as template_sections,
        t.required_ppe, t.required_certifications,
        u.display_name as inspector_name, u.email as inspector_email
      FROM checklists c
      JOIN equipments e ON c.equipment_id = e.id
      JOIN checklist_templates t ON c.template_id = t.id
      JOIN users u ON c.inspector_id = u.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist not found'
      });
    }

    const checklist = result.rows[0];

    // Créer le PDF
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Headers pour téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_inspection_${checklist.equipment_id}_${id}.pdf`);

    doc.pipe(res);

    // ========== EN-TÊTE ==========
    doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT D\'INSPECTION', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('PlantHealthCheck - OCP Morocco', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown(2);

    // ========== INFORMATIONS ÉQUIPEMENT ==========
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('ÉQUIPEMENT INSPECTÉ');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');

    const equipmentInfo = [
      ['ID:', checklist.equipment_id],
      ['Nom:', checklist.equipment_name],
      ['Type:', checklist.equipment_type],
      ['Fabricant:', checklist.manufacturer || 'N/A'],
      ['Modèle:', checklist.model || 'N/A'],
      ['N° Série:', checklist.serial_number || 'N/A'],
      ['Localisation:', `${checklist.building} - ${checklist.zone}`],
      ['Criticité:', checklist.criticality_level?.toUpperCase() || 'N/A'],
      ['Responsable:', checklist.responsible_person || 'N/A']
    ];

    let yPosition = doc.y;
    equipmentInfo.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 50, yPosition, { width: 150, continued: true });
      doc.font('Helvetica').text(value, { width: 350 });
      yPosition = doc.y + 5;
    });

    doc.moveDown(2);

    // ========== INFORMATIONS INSPECTION ==========
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('DÉTAILS DE L\'INSPECTION');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');

    const inspectionInfo = [
      ['Type d\'inspection:', checklist.template_title],
      ['Inspecteur:', `${checklist.inspector_name} (${checklist.inspector_email})`],
      ['Date planifiée:', checklist.scheduled_date ? new Date(checklist.scheduled_date).toLocaleDateString('fr-FR') : 'N/A'],
      ['Date de réalisation:', checklist.completed_at ? new Date(checklist.completed_at).toLocaleDateString('fr-FR') : 'En cours'],
      ['Statut:', checklist.status],
      ['Score obtenu:', checklist.score ? `${Math.round(checklist.score)}%` : 'N/A'],
      ['Résultat final:', checklist.final_status || 'En attente']
    ];

    yPosition = doc.y;
    inspectionInfo.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 50, yPosition, { width: 180, continued: true });
      doc.font('Helvetica').text(value, { width: 320 });
      yPosition = doc.y + 5;
    });

    doc.moveDown(2);

    // ========== RÉSULTAT GLOBAL ==========
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('RÉSULTAT GLOBAL');
    doc.moveDown(0.5);

    // Boîte de score
    const scoreBoxY = doc.y;
    let scoreColor = '#22c55e'; // Vert par défaut
    if (checklist.score < 90 && checklist.score >= 75) scoreColor = '#f59e0b'; // Orange
    else if (checklist.score < 75 && checklist.score >= 50) scoreColor = '#ef4444'; // Rouge
    else if (checklist.score < 50) scoreColor = '#991b1b'; // Rouge foncé

    doc.rect(50, scoreBoxY, 495, 80).fillAndStroke(scoreColor, '#000');
    doc.fontSize(48).font('Helvetica-Bold').fillColor('white')
       .text(`${Math.round(checklist.score || 0)}%`, 50, scoreBoxY + 15, { width: 495, align: 'center' });
    
    doc.fontSize(12).font('Helvetica').fillColor('white')
       .text(`${checklist.passed_items || 0}/${checklist.total_items || 0} items validés`, 50, scoreBoxY + 60, { width: 495, align: 'center' });

    doc.moveDown(6);

    // ========== DÉTAILS PAR SECTION ==========
    if (doc.y > 650) doc.addPage();
    
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('DÉTAILS DE L\'INSPECTION');
    doc.moveDown();

    const sections = checklist.template_sections;
    const responses = checklist.responses;

    sections.forEach((section, sectionIndex) => {
      // Nouvelle page si nécessaire
      if (doc.y > 700) doc.addPage();

      doc.fontSize(12).font('Helvetica-Bold').fillColor('black')
         .text(`${section.name}`, 50);
      doc.moveDown(0.5);

      section.items.forEach((item, itemIndex) => {
        const response = responses[item.id];

        // Nouvelle page si nécessaire
        if (doc.y > 720) doc.addPage();

        // Icône de statut
        let statusIcon = '○';
        let statusColor = 'gray';
        
        if (response) {
          if (item.type === 'boolean') {
            statusIcon = response.value ? '✓' : '✗';
            statusColor = response.value ? 'green' : 'red';
          } else if (item.type === 'number') {
            if (item.range) {
              const inRange = response.value >= item.range.min && response.value <= item.range.max;
              statusIcon = inRange ? '✓' : '✗';
              statusColor = inRange ? 'green' : 'red';
            } else {
              statusIcon = '✓';
              statusColor = 'green';
            }
          } else if (item.type === 'select') {
            const selectedOption = item.options?.find(opt => opt.value === response.value);
            statusIcon = selectedOption?.acceptable !== false ? '✓' : '✗';
            statusColor = selectedOption?.acceptable !== false ? 'green' : 'red';
          } else {
            statusIcon = '✓';
            statusColor = 'green';
          }
        }

        doc.fontSize(10).fillColor(statusColor).text(statusIcon, 60, doc.y, { continued: true });
        doc.fillColor('black').text(` ${item.check}`, { width: 400 });

        if (response) {
          let valueText = '';
          if (item.type === 'boolean') {
            valueText = response.value ? 'Oui' : 'Non';
          } else if (item.type === 'number') {
            valueText = `${response.value} ${item.unit || ''}`;
            if (item.range) {
              valueText += ` (Plage: ${item.range.min}-${item.range.max})`;
            }
          } else if (item.type === 'select') {
            const selectedOption = item.options?.find(opt => opt.value === response.value);
            valueText = selectedOption?.label || response.value;
          } else if (item.type === 'textarea') {
            valueText = response.value || 'N/A';
          }

          doc.fontSize(9).fillColor('#666')
             .text(`   Réponse: ${valueText}`, 70);

          if (response.note) {
            doc.text(`   Note: ${response.note}`, 70);
          }
        } else {
          doc.fontSize(9).fillColor('#999').text('   Non renseigné', 70);
        }

        doc.moveDown(0.5);
      });

      doc.moveDown();
    });

    // ========== OBSERVATIONS ==========
    if (checklist.inspector_notes) {
      if (doc.y > 650) doc.addPage();
      
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('OBSERVATIONS');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('black').text(checklist.inspector_notes);
      doc.moveDown();
    }

    // ========== PROCHAINE INSPECTION ==========
    if (checklist.next_check_date) {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a5490')
         .text(`Prochaine inspection: ${new Date(checklist.next_check_date).toLocaleDateString('fr-FR')}`);
    }

    // ========== PIED DE PAGE ==========
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#666')
         .text(`Page ${i + 1} sur ${pageCount}`, 50, doc.page.height - 50, { align: 'center' });
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')} par ${req.user.display_name}`, 50, doc.page.height - 35, { align: 'center' });
    }

    doc.end();

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/v1/reports/equipment/:id - Rapport complet d'un équipement
// ============================================================================
router.post('/equipment/:id', [
  param('id').isString().notEmpty()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    // Récupérer les données de l'équipement
    const equipmentQuery = `
      SELECT * FROM equipments WHERE id = $1
    `;
    const equipmentResult = await pool.query(equipmentQuery, [id]);

    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    const equipment = equipmentResult.rows[0];

    // Récupérer les checklists
    const checklistsQuery = `
      SELECT id, completed_at, score, final_status, inspector_name
      FROM checklists
      WHERE equipment_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 10
    `;
    const checklistsResult = await pool.query(checklistsQuery, [id]);

    // Récupérer les alertes
    const alertsQuery = `
      SELECT id, alert_type, severity, title, created_at
      FROM alerts
      WHERE equipment_id = $1 AND status = 'active'
      ORDER BY severity DESC, created_at DESC
    `;
    const alertsResult = await pool.query(alertsQuery, [id]);

    // Créer le PDF
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_equipement_${id}.pdf`);

    doc.pipe(res);

    // EN-TÊTE
    doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT D\'ÉQUIPEMENT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('PlantHealthCheck - OCP Morocco', { align: 'center' });
    doc.moveDown(2);

    // INFORMATIONS ÉQUIPEMENT
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('INFORMATIONS GÉNÉRALES');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');

    const info = [
      ['ID:', equipment.id],
      ['Nom:', equipment.name],
      ['Type:', equipment.type],
      ['Catégorie:', equipment.category],
      ['Statut:', equipment.status.toUpperCase()],
      ['Score de santé:', `${equipment.health_score}%`],
      ['Localisation:', `${equipment.building} - ${equipment.zone}`],
      ['Date d\'installation:', equipment.install_date ? new Date(equipment.install_date).toLocaleDateString('fr-FR') : 'N/A'],
      ['Prochaine maintenance:', equipment.next_maintenance_date ? new Date(equipment.next_maintenance_date).toLocaleDateString('fr-FR') : 'N/A']
    ];

    let yPos = doc.y;
    info.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 50, yPos, { width: 180, continued: true });
      doc.font('Helvetica').text(value, { width: 320 });
      yPos = doc.y + 5;
    });

    doc.moveDown(2);

    // HISTORIQUE DES INSPECTIONS
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('HISTORIQUE DES INSPECTIONS');
    doc.moveDown();

    if (checklistsResult.rows.length > 0) {
      checklistsResult.rows.forEach(checklist => {
        doc.fontSize(10).font('Helvetica').fillColor('black')
           .text(`${new Date(checklist.completed_at).toLocaleDateString('fr-FR')} - Score: ${Math.round(checklist.score)}% - ${checklist.final_status} - ${checklist.inspector_name}`);
      });
    } else {
      doc.fontSize(10).text('Aucune inspection complétée');
    }

    doc.moveDown(2);

    // ALERTES ACTIVES
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5490').text('ALERTES ACTIVES');
    doc.moveDown();

    if (alertsResult.rows.length > 0) {
      alertsResult.rows.forEach(alert => {
        const severityColors = {
          critical: '#991b1b',
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#22c55e'
        };
        doc.fontSize(10).fillColor(severityColors[alert.severity] || 'black')
           .text(`[${alert.severity.toUpperCase()}] ${alert.title}`);
      });
    } else {
      doc.fontSize(10).fillColor('green').text('Aucune alerte active');
    }

    doc.end();

  } catch (error) {
    next(error);
  }
});

module.exports = router;
