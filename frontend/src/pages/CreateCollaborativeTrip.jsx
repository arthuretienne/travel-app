// frontend/src/pages/CreateCollaborativeTrip.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft, Users, Upload, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CreateCollaborativeTrip() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    coverImageUrl: '',
    maxMembers: 8,
    requireAllVotes: false,
  });

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Le nom du voyage est requis');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create trip');
      }

      const data = await response.json();

      // Navigate to the trip detail page
      navigate(`/trips/${data.data.id}`);
    } catch (err) {
      console.error('Error creating trip:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/trips')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux voyages
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Créer un voyage collaboratif</h1>
          <p className="text-gray-600 mt-1">Invitez vos amis et organisez votre voyage en groupe</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Trip Name */}
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom du voyage *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Voyage à Tokyo 2025"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Cover Image URL */}
          <div className="mb-6">
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Image de couverture (URL)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="coverImageUrl"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.coverImageUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, coverImageUrl: '' })}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {formData.coverImageUrl && (
              <div className="mt-3">
                <img
                  src={formData.coverImageUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Optionnel - URL d'une image pour illustrer votre voyage
            </p>
          </div>

          {/* Max Members */}
          <div className="mb-6">
            <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre maximum de participants
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                id="maxMembers"
                min="2"
                max="20"
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                className="flex-1"
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg min-w-[80px] justify-center">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">{formData.maxMembers}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Le nombre maximum de voyageurs pour ce voyage (vous inclus)
            </p>
          </div>

          {/* Require All Votes */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requireAllVotes}
                onChange={(e) => setFormData({ ...formData, requireAllVotes: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Exiger que tous les membres votent
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Si activé, le vote ne pourra être finalisé que lorsque tous les membres auront voté.
                  Sinon, 50% des votes suffisent.
                </p>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Prochaines étapes :</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>Inviter des amis à rejoindre le voyage</li>
              <li>Proposer des destinations pour le vote</li>
              <li>Voter ensemble sur la meilleure destination</li>
              <li>Réserver les billets et hébergements</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/trips')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={creating}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating || !formData.name.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Création...' : 'Créer le voyage'}
            </button>
          </div>
        </form>

        {/* Convert from saved trip option */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Vous avez déjà un voyage enregistré ?</strong>
          </p>
          <p className="text-sm text-gray-600 mb-3">
            Vous pouvez convertir un de vos voyages solo en voyage collaboratif depuis votre tableau de bord.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Voir mes voyages enregistrés →
          </button>
        </div>
      </div>
    </div>
  );
}
