import React, { useState } from 'react';
import { Coordinates } from '../types';

interface ManualLocationEntryProps {
  onLocationSet: (coordinates: Coordinates) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function ManualLocationEntry({ onLocationSet, onCancel, isOpen }: ManualLocationEntryProps) {
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: '', lng: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'address' | 'coordinates'>('address');

  if (!isOpen) return null;

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use browser's built-in geocoding if available, otherwise show coordinates input
      if ('google' in window && (window as any).google?.maps) {
        const geocoder = new (window as any).google.maps.Geocoder();
        
        geocoder.geocode({ address }, (results: any[], status: string) => {
          setIsLoading(false);
          
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            onLocationSet({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            setError('Address not found. Please try entering coordinates instead.');
            setActiveTab('coordinates');
          }
        });
      } else {
        // Fallback: suggest using coordinates
        setError('Address lookup not available. Please enter coordinates instead.');
        setActiveTab('coordinates');
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
      setError('Failed to find address. Please try entering coordinates instead.');
      setActiveTab('coordinates');
    }
  };

  const handleCoordinatesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = parseFloat(coordinates.lat);
    const lng = parseFloat(coordinates.lng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid numbers for latitude and longitude');
      return;
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }

    onLocationSet({ lat, lng });
  };

  const handleCancel = () => {
    setAddress('');
    setCoordinates({ lat: '', lng: '' });
    setError(null);
    setActiveTab('address');
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Enter Your Location
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            We need your location to find nearby Subway restaurants
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('address')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'address'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📍 Address
          </button>
          <button
            onClick={() => setActiveTab('coordinates')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'coordinates'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🌐 Coordinates
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {activeTab === 'address' ? (
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address or City
                </label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, New York, NY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!address.trim() || isLoading}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Finding...' : 'Find Location'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCoordinatesSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    id="latitude"
                    value={coordinates.lat}
                    onChange={(e) => setCoordinates(prev => ({ ...prev, lat: e.target.value }))}
                    placeholder="40.7128"
                    step="any"
                    min="-90"
                    max="90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    id="longitude"
                    value={coordinates.lng}
                    onChange={(e) => setCoordinates(prev => ({ ...prev, lng: e.target.value }))}
                    placeholder="-74.0060"
                    step="any"
                    min="-180"
                    max="180"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">💡 How to find coordinates:</p>
                <ul className="space-y-1">
                  <li>• Open Google Maps and right-click your location</li>
                  <li>• Click the coordinates that appear</li>
                  <li>• Copy and paste them here</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!coordinates.lat || !coordinates.lng}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Set Location
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}