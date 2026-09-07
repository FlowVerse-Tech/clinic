'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Medicine {
  medicine_id: number;
  name: string;
  batch_number: string;
  expiry_date: string;
  current_stock: number;
}

export default function PharmacyPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stock' | 'inward' | 'outward'>('stock');

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);

  // Inward Form State
  const [inwardForm, setInwardForm] = useState({
    name: '',
    batch_number: '',
    expiry_date: '',
    quantity: '',
    supplier: '',
  });
  const [inwardLoading, setInwardLoading] = useState(false);
  const [inwardMessage, setInwardMessage] = useState({ type: '', text: '' });

  // Outward Form State
  const [outwardMedicineId, setOutwardMedicineId] = useState('');
  const [outwardQuantity, setOutwardQuantity] = useState('');
  const [outwardPatientId, setOutwardPatientId] = useState('');
  const [outwardPatientName, setOutwardPatientName] = useState('');
  const [outwardLoading, setOutwardLoading] = useState(false);
  const [outwardMessage, setOutwardMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(console.error);

    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (res.ok) {
        setMedicines(data.medicines || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Inward submission
  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardForm.name.trim() || !inwardForm.batch_number.trim() || !inwardForm.expiry_date || !inwardForm.quantity) {
      setInwardMessage({ type: 'error', text: 'Please fill in all required inward fields.' });
      return;
    }

    setInwardLoading(true);
    setInwardMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/medicines/inward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inwardForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setInwardMessage({ type: 'error', text: data.error || 'Failed to record inward stock' });
        setInwardLoading(false);
        return;
      }

      setInwardMessage({ type: 'success', text: `Stock recorded! Current stock: ${data.current_stock}` });
      setInwardForm({
        name: '',
        batch_number: '',
        expiry_date: '',
        quantity: '',
        supplier: '',
      });
      loadMedicines();
    } catch (err: any) {
      setInwardMessage({ type: 'error', text: 'Error recording inward stock' });
    } finally {
      setInwardLoading(false);
    }
  };

  // Check patient ID on blur for outward
  const handleVerifyPatient = async (pid: string) => {
    if (!pid.trim()) {
      setOutwardPatientName('');
      return;
    }
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(pid.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setOutwardPatientName(data.patient.name);
      } else {
        setOutwardPatientName('⚠️ Patient ID not found');
      }
    } catch {
      setOutwardPatientName('');
    }
  };

  // Outward submission
  const handleOutwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outwardMedicineId || !outwardQuantity) {
      setOutwardMessage({ type: 'error', text: 'Please select a medicine and enter quantity.' });
      return;
    }

    setOutwardLoading(true);
    setOutwardMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/medicines/outward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: outwardMedicineId,
          quantity: parseInt(outwardQuantity, 10),
          patient_id: outwardPatientId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOutwardMessage({ type: 'error', text: data.error || 'Failed to dispense medicine' });
        setOutwardLoading(false);
        return;
      }

      setOutwardMessage({
        type: 'success',
        text: `Successfully dispensed! Remaining stock: ${data.current_stock}`,
      });
      setOutwardQuantity('');
      setOutwardPatientId('');
      setOutwardPatientName('');
      loadMedicines();
    } catch (err: any) {
      setOutwardMessage({ type: 'error', text: 'Error dispensing medicine' });
    } finally {
      setOutwardLoading(false);
    }
  };

  const filteredMedicines = medicines.filter((m) =>
    m.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    m.batch_number.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const selectedMedObj = medicines.find((m) => m.medicine_id.toString() === outwardMedicineId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pharmacy &amp; Stock Management</h1>
            <p className="text-sm text-gray-600">Track drug inventory, record inward supplier shipments, and dispense medications.</p>
          </div>

          <div className="flex bg-white rounded-md border border-gray-300 p-0.5">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'stock'
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Stock Overview ({medicines.length})
            </button>
            <button
              onClick={() => setActiveTab('inward')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'inward'
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              + Inward Stock
            </button>
            <button
              onClick={() => setActiveTab('outward')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'outward'
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Dispense (Outward)
            </button>
          </div>
        </div>

        {/* TAB 1: STOCK OVERVIEW */}
        {activeTab === 'stock' && (
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search medicine or batch..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <label htmlFor="lowStockThreshold" className="font-semibold uppercase">Low-Stock Alert Threshold:</label>
                <input
                  id="lowStockThreshold"
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-bold text-gray-900"
                />
                <span className="text-gray-400">(units)</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-gray-500">Loading medicine inventory...</div>
            ) : filteredMedicines.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">
                No medicines found. Click &quot;+ Inward Stock&quot; to add new inventory.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Medicine Name</th>
                      <th className="px-4 py-3 text-left">Batch Number</th>
                      <th className="px-4 py-3 text-left">Expiry Date</th>
                      <th className="px-4 py-3 text-left">Current Stock</th>
                      <th className="px-4 py-3 text-left">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredMedicines.map((m) => {
                      const isLowStock = m.current_stock <= lowStockThreshold;
                      const isOutOfStock = m.current_stock === 0;
                      const isExpired = new Date(m.expiry_date) < new Date();

                      return (
                        <tr
                          key={m.medicine_id}
                          className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50/50' : ''}`}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900 text-sm">
                            {m.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600">
                            {m.batch_number}
                          </td>
                          <td className="px-4 py-3">
                            <span className={isExpired ? 'text-red-600 font-bold' : 'text-gray-700'}>
                              {new Date(m.expiry_date).toLocaleDateString()}
                              {isExpired && ' (Expired)'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-sm font-bold ${
                                isOutOfStock
                                  ? 'text-red-700'
                                  : isLowStock
                                  ? 'text-amber-700 font-extrabold'
                                  : 'text-gray-900'
                              }`}
                            >
                              {m.current_stock}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
                                Low Stock (&le; {lowStockThreshold})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                Adequate
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INWARD STOCK ENTRY */}
        {activeTab === 'inward' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Add Inward Stock (Supplier Inflow)</h2>
            <p className="text-xs text-gray-500 mb-4">
              Enter medicine details received from suppliers. If medicine and batch already exist, quantity will be added automatically.
            </p>

            {inwardMessage.text && (
              <div
                className={`mb-4 p-3 rounded text-xs ${
                  inwardMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {inwardMessage.text}
              </div>
            )}

            <form onSubmit={handleInwardSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  list="medicine-names"
                  placeholder="e.g. Paracetamol 650mg, Amoxicillin 500mg"
                  value={inwardForm.name}
                  onChange={(e) => setInwardForm({ ...inwardForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <datalist id="medicine-names">
                  {medicines.map((m) => (
                    <option key={m.medicine_id} value={m.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-2026-X"
                    value={inwardForm.batch_number}
                    onChange={(e) => setInwardForm({ ...inwardForm, batch_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={inwardForm.expiry_date}
                    onChange={(e) => setInwardForm({ ...inwardForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 100"
                    value={inwardForm.quantity}
                    onChange={(e) => setInwardForm({ ...inwardForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Supplier Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MedSupply Corp"
                    value={inwardForm.supplier}
                    onChange={(e) => setInwardForm({ ...inwardForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={inwardLoading}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded shadow-sm transition-colors disabled:opacity-50"
                >
                  {inwardLoading ? 'Recording Stock...' : 'Save Inward Stock'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: DISPENSE MEDICINE (OUTWARD) */}
        {activeTab === 'outward' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Dispense Medicine (Outward Transaction)</h2>
            <p className="text-xs text-gray-500 mb-4">
              Deduct dispensed units from active stock and optionally link the outward entry to a patient profile.
            </p>

            {outwardMessage.text && (
              <div
                className={`mb-4 p-3 rounded text-xs ${
                  outwardMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {outwardMessage.text}
              </div>
            )}

            <form onSubmit={handleOutwardSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Select Medicine *
                </label>
                <select
                  required
                  value={outwardMedicineId}
                  onChange={(e) => setOutwardMedicineId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 bg-white focus:outline-none"
                >
                  <option value="">-- Choose Medicine --</option>
                  {medicines.map((m) => (
                    <option key={m.medicine_id} value={m.medicine_id} disabled={m.current_stock <= 0}>
                      {m.name} | Batch: {m.batch_number} | Available: {m.current_stock}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMedObj && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs flex justify-between items-center text-amber-900">
                  <span>Selected: <strong>{selectedMedObj.name}</strong> (Batch: {selectedMedObj.batch_number})</span>
                  <span className="font-bold">Available Stock: {selectedMedObj.current_stock}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Quantity to Dispense *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedMedObj ? selectedMedObj.current_stock : undefined}
                  placeholder="e.g. 10"
                  value={outwardQuantity}
                  onChange={(e) => setOutwardQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Patient ID (Optional — links to patient profile &amp; bill)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 202609070001"
                    value={outwardPatientId}
                    onChange={(e) => setOutwardPatientId(e.target.value)}
                    onBlur={(e) => handleVerifyPatient(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyPatient(outwardPatientId)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-medium rounded"
                  >
                    Verify
                  </button>
                </div>
                {outwardPatientName && (
                  <div className="mt-1 text-xs text-blue-700 font-medium">
                    Patient: {outwardPatientName}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={outwardLoading || !outwardMedicineId}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded shadow-sm transition-colors disabled:opacity-50"
                >
                  {outwardLoading ? 'Dispensing...' : 'Confirm Dispense'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
