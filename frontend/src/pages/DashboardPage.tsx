import { useEffect, useState } from 'react';
import { dashboardApi, DashboardStats } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = {
  conforme: '#22c55e',
  à_vérifier: '#f59e0b',
  critique: '#ef4444',
  en_attente: '#6b7280'
};

const SEVERITY_COLORS = {
  critical: '#991b1b',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e'
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Réessayer
          </button>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  const { overview, checklistsByStatus, equipmentsByCategory, alertsBySeverity, inspectionsTrend, lowScoreEquipments } = stats;

  // Préparer les données pour les graphiques
  const checklistsData = Object.entries(checklistsByStatus).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: COLORS[status as keyof typeof COLORS]
  }));

  const alertsData = Object.entries(alertsBySeverity).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]
  }));

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">Bienvenue ! Voici l'état de santé de vos installations.</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Checklists complétées */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Checklists complétées</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{overview.checklistsCompletedMonth}</p>
              <p className="text-xs text-green-700 mt-1">Ce mois</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-500 opacity-80" />
          </div>
          {overview.checklistsEvolution !== 0 && (
            <div className="mt-4 flex items-center gap-1">
              {overview.checklistsEvolution > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${overview.checklistsEvolution > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(overview.checklistsEvolution)}% vs mois dernier
              </span>
            </div>
          )}
        </Card>

        {/* Équipements suivis */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Équipements suivis</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{overview.totalEquipments}</p>
              <p className="text-xs text-blue-700 mt-1">Actifs</p>
            </div>
            <Wrench className="w-12 h-12 text-blue-500 opacity-80" />
          </div>
          <div className="mt-4 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-blue-600">Opérationnels:</span>
              <span className="font-medium">{overview.operationalEquipments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">En maintenance:</span>
              <span className="font-medium">{overview.maintenanceEquipments}</span>
            </div>
          </div>
        </Card>

        {/* Alertes actives */}
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Alertes actives</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{overview.activeAlerts}</p>
              <p className="text-xs text-yellow-700 mt-1">Requièrent attention</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-yellow-500 opacity-80" />
          </div>
        </Card>

        {/* Taux de conformité */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Taux de conformité</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{overview.conformityRate}%</p>
              <p className="text-xs text-purple-700 mt-1">Global</p>
            </div>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#e9d5ff"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#9333ea"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - overview.conformityRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          {overview.scoreEvolution !== 0 && (
            <div className="mt-4 flex items-center gap-1">
              {overview.scoreEvolution > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${overview.scoreEvolution > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(overview.scoreEvolution)}% vs mois dernier
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Santé des équipements */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Santé des équipements</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={checklistsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {checklistsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {checklistsData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600 capitalize">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tendance des inspections */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tendance des inspections (7 jours)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={inspectionsTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(date) => new Date(date).toLocaleDateString('fr-FR')}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Inspections"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgScore" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Score moyen (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribution par catégorie */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Équipements par catégorie</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={equipmentsByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="category" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Nombre" />
              <Bar dataKey="avgHealthScore" fill="#22c55e" name="Score santé moyen" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Alertes par sévérité */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Alertes par sévérité</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alertsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="value" name="Nombre d'alertes">
                {alertsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Équipements à faible score */}
      {lowScoreEquipments.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Équipements nécessitant attention</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Équipement</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Localisation</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Score santé</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Prochaine maintenance</th>
                </tr>
              </thead>
              <tbody>
                {lowScoreEquipments.map((equipment) => (
                  <tr key={equipment.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{equipment.name}</p>
                        <p className="text-sm text-gray-500">{equipment.type}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {equipment.building} - {equipment.zone}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div 
                            className="h-2 rounded-full"
                            style={{
                              width: `${equipment.health_score}%`,
                              backgroundColor: 
                                equipment.health_score >= 75 ? '#22c55e' :
                                equipment.health_score >= 50 ? '#f59e0b' :
                                '#ef4444'
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{equipment.health_score}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${equipment.status === 'operational' ? 'bg-green-100 text-green-800' :
                          equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          equipment.status === 'critical' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {equipment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {equipment.next_maintenance_date 
                        ? new Date(equipment.next_maintenance_date).toLocaleDateString('fr-FR')
                        : 'Non planifiée'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
