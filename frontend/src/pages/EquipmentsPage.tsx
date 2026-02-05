import { useEffect, useState } from 'react';
import { equipmentsApi, Equipment } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Plus, MapPin, Wrench, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS = {
  operational: 'Opérationnel',
  maintenance: 'En maintenance',
  critical: 'Critique',
  outOfService: 'Hors service'
};

const STATUS_COLORS = {
  operational: 'bg-green-100 text-green-800 border-green-200',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
  outOfService: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function EquipmentsPage() {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    building: ''
  });

  useEffect(() => {
    loadEquipments();
  }, [filters]);

  const loadEquipments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.building) params.building = filters.building;

      const response = await equipmentsApi.getAll(params);
      setEquipments(response.data);
    } catch (error) {
      console.error('Error loading equipments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Équipements</h1>
          <p className="text-gray-600 mt-1">Gérez votre parc d'équipements industriels</p>
        </div>
        <Button onClick={() => navigate('/equipments/new')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un équipement
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher équipements, checklists..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Tous les statuts</option>
            <option value="operational">Opérationnel</option>
            <option value="maintenance">En maintenance</option>
            <option value="critical">Critique</option>
            <option value="outOfService">Hors service</option>
          </Select>

          <Select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">Toutes les catégories</option>
            <option value="compression">Compression</option>
            <option value="pumping">Pompage</option>
            <option value="transport">Transport</option>
            <option value="chemical_process">Processus chimique</option>
            <option value="power_generation">Génération électrique</option>
          </Select>

          <Select
            value={filters.building}
            onChange={(e) => setFilters({ ...filters, building: e.target.value })}
          >
            <option value="">Tous les bâtiments</option>
            <option value="Bâtiment A">Bâtiment A</option>
            <option value="Bâtiment B">Bâtiment B</option>
            <option value="Bâtiment C">Bâtiment C</option>
            <option value="Bâtiment D">Bâtiment D</option>
            <option value="Bâtiment E">Bâtiment E</option>
          </Select>
        </div>
      </Card>

      {/* Liste des équipements */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : equipments.length === 0 ? (
        <Card className="p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun équipement trouvé</h3>
          <p className="text-gray-600">Essayez de modifier vos filtres ou ajoutez un nouvel équipement</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipments.map((equipment) => (
            <Card 
              key={equipment.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-t-4"
              style={{
                borderTopColor: 
                  equipment.status === 'operational' ? '#22c55e' :
                  equipment.status === 'maintenance' ? '#f59e0b' :
                  equipment.status === 'critical' ? '#ef4444' :
                  '#6b7280'
              }}
              onClick={() => navigate(`/equipments/${equipment.id}`)}
            >
              {/* En-tête */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{equipment.name}</h3>
                    <p className="text-sm text-gray-500">{equipment.type}</p>
                  </div>
                </div>
              </div>

              {/* Score de santé */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Score de santé</span>
                  <span className="text-sm font-bold">{equipment.health_score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${equipment.health_score}%`,
                      backgroundColor: 
                        equipment.health_score >= 90 ? '#22c55e' :
                        equipment.health_score >= 75 ? '#84cc16' :
                        equipment.health_score >= 50 ? '#f59e0b' :
                        '#ef4444'
                    }}
                  ></div>
                </div>
              </div>

              {/* Statut */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[equipment.status]}`}>
                  {STATUS_LABELS[equipment.status]}
                </span>
              </div>

              {/* Localisation */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span>{equipment.building} - {equipment.zone}</span>
              </div>

              {/* Date maintenance */}
              {equipment.next_maintenance_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Maintenance: {new Date(equipment.next_maintenance_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
