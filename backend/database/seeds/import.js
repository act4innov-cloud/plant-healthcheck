const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configuration PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function importEquipments() {
  console.log('📦 Importing equipments...');
  
  // Charger les données JSON
  const equipmentsData = JSON.parse(
    await fs.readFile(path.join(__dirname, 'equipments.json'), 'utf8')
  );
  
  const additionalData = JSON.parse(
    await fs.readFile(path.join(__dirname, 'equipments.json'), 'utf8')
  );
  
  const allEquipments = [
    ...equipmentsData.equipments,
    ...additionalData.additionalEquipments
  ];
  
  let inserted = 0;
  
  for (const eq of allEquipments) {
    try {
      await pool.query(`
        INSERT INTO equipments (
          id, name, type, category, manufacturer, model, serial_number,
          building, zone, floor, coordinates, status, health_score,
          install_date, warranty_expiry_date, last_maintenance_date, next_maintenance_date,
          maintenance_frequency, operating_hours, criticality_level,
          critical_gases, safety_equipment, specifications,
          responsible_person, contact_email, contact_phone,
          documents, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        ) ON CONFLICT (id) DO UPDATE SET
          health_score = EXCLUDED.health_score,
          status = EXCLUDED.status,
          last_maintenance_date = EXCLUDED.last_maintenance_date,
          next_maintenance_date = EXCLUDED.next_maintenance_date,
          updated_at = CURRENT_TIMESTAMP
      `, [
        eq.id,
        eq.name,
        eq.type,
        eq.category || 'general',
        eq.manufacturer || null,
        eq.model || null,
        eq.serialNumber || null,
        eq.building,
        eq.zone,
        eq.floor || null,
        eq.coordinates ? JSON.stringify(eq.coordinates) : null,
        eq.status,
        eq.healthScore,
        eq.installDate || null,
        eq.warrantyExpiryDate || null,
        eq.lastMaintenanceDate || null,
        eq.nextMaintenanceDate || null,
        eq.maintenanceFrequency || null,
        eq.operatingHours || 0,
        eq.criticalityLevel || 'medium',
        eq.criticalGases || [],
        eq.safetyEquipment || [],
        eq.specifications ? JSON.stringify(eq.specifications) : null,
        eq.responsiblePerson || null,
        eq.contactEmail || null,
        eq.contactPhone || null,
        eq.documents || [],
        eq.notes || null
      ]);
      
      inserted++;
      process.stdout.write(`\r   ✓ ${inserted}/${allEquipments.length} equipments imported`);
    } catch (error) {
      console.error(`\n   ✗ Error importing ${eq.id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Successfully imported ${inserted} equipments\n`);
}

async function importTemplates() {
  console.log('📋 Importing checklist templates...');
  
  const templatesData = JSON.parse(
    await fs.readFile(path.join(__dirname, 'templates.json'), 'utf8')
  );
  
  let inserted = 0;
  
  for (const tpl of templatesData.templates) {
    try {
      await pool.query(`
        INSERT INTO checklist_templates (
          id, equipment_type, title, description, version,
          frequency, estimated_duration, required_certifications,
          required_ppe, sections, scoring_rules, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true
        ) ON CONFLICT (id) DO UPDATE SET
          version = EXCLUDED.version,
          sections = EXCLUDED.sections,
          scoring_rules = EXCLUDED.scoring_rules,
          updated_at = CURRENT_TIMESTAMP
      `, [
        tpl.id,
        tpl.equipmentType,
        tpl.title,
        tpl.description || null,
        tpl.version,
        tpl.frequency || null,
        tpl.estimatedDuration || null,
        tpl.requiredCertifications || [],
        tpl.requiredPPE || [],
        JSON.stringify(tpl.sections),
        JSON.stringify(tpl.scoringRules)
      ]);
      
      inserted++;
      process.stdout.write(`\r   ✓ ${inserted}/${templatesData.templates.length} templates imported`);
    } catch (error) {
      console.error(`\n   ✗ Error importing ${tpl.id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Successfully imported ${inserted} templates\n`);
}

async function generateHistoricalChecklists() {
  console.log('📊 Generating historical checklists...');
  
  // Récupérer tous les équipements
  const { rows: equipments } = await pool.query('SELECT id, category FROM equipments');
  
  // Récupérer les templates
  const { rows: templates } = await pool.query('SELECT id, equipment_type, sections, scoring_rules FROM checklist_templates');
  
  // Récupérer les inspecteurs
  const { rows: inspectors } = await pool.query("SELECT id, display_name FROM users WHERE role = 'inspector'");
  
  if (inspectors.length === 0) {
    console.log('⚠️  No inspectors found. Creating sample inspector...');
    await pool.query(`
      INSERT INTO users (firebase_uid, email, display_name, role)
      VALUES ('sample-inspector-uid', 'inspector@ocp.ma', 'Sample Inspector', 'inspector')
      ON CONFLICT DO NOTHING
    `);
    const { rows: newInspectors } = await pool.query("SELECT id, display_name FROM users WHERE role = 'inspector'");
    inspectors.push(...newInspectors);
  }
  
  let generated = 0;
  const targetChecklists = 127; // Comme affiché dans le dashboard
  
  // Générer des checklists sur les 6 derniers mois
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  for (const equipment of equipments) {
    // Trouver le template correspondant
    const template = templates.find(t => t.equipment_type === equipment.category);
    if (!template) continue;
    
    // Nombre de checklists à générer pour cet équipement (2-4)
    const numChecklists = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < numChecklists && generated < targetChecklists; i++) {
      const inspector = inspectors[Math.floor(Math.random() * inspectors.length)];
      
      // Date aléatoire dans les 6 derniers mois
      const completedDate = new Date(
        sixMonthsAgo.getTime() + Math.random() * (Date.now() - sixMonthsAgo.getTime())
      );
      
      // Générer des réponses fictives
      const responses = {};
      const sections = template.sections;
      let totalItems = 0;
      let passedItems = 0;
      
      sections.forEach(section => {
        section.items.forEach(item => {
          totalItems++;
          
          let value;
          let passed = true;
          
          switch (item.type) {
            case 'boolean':
              value = Math.random() > 0.15; // 85% de réussite
              passed = value;
              break;
            case 'number':
              if (item.range) {
                const min = item.range.min;
                const max = item.range.max;
                value = min + Math.random() * (max - min);
                passed = value >= min && value <= max;
              } else {
                value = Math.random() * 100;
                passed = true;
              }
              break;
            case 'select':
              const acceptableOptions = item.options.filter(opt => opt.acceptable !== false);
              const selectedOption = acceptableOptions[Math.floor(Math.random() * acceptableOptions.length)];
              value = selectedOption.value;
              passed = selectedOption.acceptable !== false;
              break;
            case 'textarea':
              value = Math.random() > 0.7 ? 'Observations normales, RAS' : null;
              passed = true;
              break;
            case 'file':
              value = Math.random() > 0.6 ? `photo_${equipment.id}_${Date.now()}.jpg` : null;
              passed = true;
              break;
            default:
              value = null;
              passed = true;
          }
          
          responses[item.id] = { value, note: null };
          if (passed) passedItems++;
        });
      });
      
      const score = (passedItems / totalItems) * 100;
      
      // Déterminer le statut final
      let finalStatus;
      if (score >= 90) finalStatus = 'conforme';
      else if (score >= 75) finalStatus = 'à_vérifier';
      else if (score >= 50) finalStatus = 'critique';
      else finalStatus = 'en_attente';
      
      // Calculer next_check_date basé sur la fréquence
      const nextCheckDate = new Date(completedDate);
      switch (template.frequency) {
        case 'weekly': nextCheckDate.setDate(nextCheckDate.getDate() + 7); break;
        case 'biweekly': nextCheckDate.setDate(nextCheckDate.getDate() + 14); break;
        case 'monthly': nextCheckDate.setMonth(nextCheckDate.getMonth() + 1); break;
        case 'quarterly': nextCheckDate.setMonth(nextCheckDate.getMonth() + 3); break;
        case 'semiannual': nextCheckDate.setMonth(nextCheckDate.getMonth() + 6); break;
        default: nextCheckDate.setMonth(nextCheckDate.getMonth() + 1);
      }
      
      try {
        await pool.query(`
          INSERT INTO checklists (
            equipment_id, template_id, inspector_id, inspector_name,
            scheduled_date, started_at, completed_at, status,
            responses, total_items, completed_items, passed_items, failed_items,
            score, final_status, next_check_date
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'completed',
            $8, $9, $10, $11, $12, $13, $14, $15
          )
        `, [
          equipment.id,
          template.id,
          inspector.id,
          inspector.display_name,
          completedDate.toISOString().split('T')[0],
          completedDate.toISOString(),
          completedDate.toISOString(),
          JSON.stringify(responses),
          totalItems,
          totalItems,
          passedItems,
          totalItems - passedItems,
          score,
          finalStatus,
          nextCheckDate.toISOString().split('T')[0]
        ]);
        
        generated++;
        process.stdout.write(`\r   ✓ ${generated}/${targetChecklists} checklists generated`);
      } catch (error) {
        console.error(`\n   ✗ Error generating checklist:`, error.message);
      }
      
      if (generated >= targetChecklists) break;
    }
    
    if (generated >= targetChecklists) break;
  }
  
  console.log(`\n✅ Successfully generated ${generated} historical checklists\n`);
}

async function updateEquipmentHealthScores() {
  console.log('🔄 Updating equipment health scores...');
  
  const { rows: equipments } = await pool.query('SELECT id FROM equipments');
  
  let updated = 0;
  
  for (const eq of equipments) {
    try {
      await pool.query(`
        UPDATE equipments 
        SET health_score = calculate_equipment_health_score($1)
        WHERE id = $1
      `, [eq.id]);
      
      updated++;
      process.stdout.write(`\r   ✓ ${updated}/${equipments.length} health scores updated`);
    } catch (error) {
      console.error(`\n   ✗ Error updating ${eq.id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Successfully updated ${updated} health scores\n`);
}

async function generateAlerts() {
  console.log('🚨 Generating alerts...');
  
  // Alertes pour équipements en maintenance
  await pool.query(`
    INSERT INTO alerts (equipment_id, alert_type, severity, title, message, status)
    SELECT 
      id,
      'maintenance_due',
      'medium',
      'Maintenance planifiée - ' || name,
      'Équipement en maintenance planifiée. Vérification requise.',
      'active'
    FROM equipments
    WHERE status = 'maintenance'
    ON CONFLICT DO NOTHING
  `);
  
  // Alertes pour équipements critiques
  await pool.query(`
    INSERT INTO alerts (equipment_id, alert_type, severity, title, message, status)
    SELECT 
      id,
      'critical_failure',
      'critical',
      'ALERTE CRITIQUE - ' || name,
      'Équipement en état critique. Intervention urgente requise.',
      'active'
    FROM equipments
    WHERE status = 'critical' OR health_score < 50
    ON CONFLICT DO NOTHING
  `);
  
  // Alertes pour inspections en retard
  await pool.query(`
    INSERT INTO alerts (equipment_id, alert_type, severity, title, message, status)
    SELECT 
      id,
      'inspection_overdue',
      'high',
      'Inspection en retard - ' || name,
      'La prochaine inspection est échue. Planifier immédiatement.',
      'active'
    FROM equipments
    WHERE next_maintenance_date < CURRENT_DATE
    ON CONFLICT DO NOTHING
  `);
  
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) as count FROM alerts WHERE status = $1', ['active']);
  
  console.log(`✅ Successfully generated ${count} active alerts\n`);
}

async function main() {
  try {
    console.log('\n🚀 Starting database seeding...\n');
    
    await importEquipments();
    await importTemplates();
    await generateHistoricalChecklists();
    await updateEquipmentHealthScores();
    await generateAlerts();
    
    console.log('✅ Database seeding completed successfully!\n');
    
    // Afficher les statistiques
    const stats = await pool.query('SELECT * FROM dashboard_stats');
    console.log('📊 Database Statistics:');
    console.log('   - Total Equipments:', stats.rows[0].total_equipments);
    console.log('   - Operational:', stats.rows[0].operational_equipments);
    console.log('   - In Maintenance:', stats.rows[0].maintenance_equipments);
    console.log('   - Critical:', stats.rows[0].critical_equipments);
    console.log('   - Avg Health Score:', Math.round(stats.rows[0].avg_health_score) + '%');
    console.log('   - Completed Checklists (30d):', stats.rows[0].checklists_completed_month);
    console.log('   - Active Alerts:', stats.rows[0].active_alerts);
    console.log('');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
