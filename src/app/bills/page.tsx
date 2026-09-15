'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Patient {
  patient_id: string;
  name: string;
  age: number;
  sex: string;
  phone_number: string;
  email: string | null;
}

interface BillItem {
  id: string;
  type: 'consultation' | 'medicine';
  name: string;
  medicine_id?: number;
  batch_number?: string;
  available_stock?: number;
  quantity: number;
  rate: number;
  total: number;
}

interface Bill {
  bill_id: number;
  patient_id: string;
  patient_name?: string;
  phone_number?: string;
  date: string;
  billing_type: string;
  amount: string;
  payment_mode: string;
  status: string;
  handled_by_name?: string;
  items?: any;
}

interface MedicineOption {
  medicine_id: number;
  name: string;
  batch_number: string;
  current_stock: number;
  expiry_date: string;
  rate: string | number;
}

interface DailySummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  consultationAmount: number;
  pharmacyAmount: number;
  count: number;
}

export default function BillsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'patient_billing' | 'daily_report'>('patient_billing');

  // Patient Search & Selected Patient
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientBills, setPatientBills] = useState<Bill[]>([]);

  // Available medicines from Pharmacy inventory
  const [availableMedicines, setAvailableMedicines] = useState<MedicineOption[]>([]);

  // Structured Bill Items
  const [billItems, setBillItems] = useState<BillItem[]>([
    {
      id: '1',
      type: 'consultation',
      name: 'Doctor Consultation Fee',
      quantity: 1, // locked at 1
      rate: 500, // custom rate
      total: 500,
    },
  ]);

  // Payment details
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [status, setStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [billLoading, setBillLoading] = useState(false);
  const [billMessage, setBillMessage] = useState({ type: '', text: '' });

  // Receipt Modal State
  const [receiptModalBill, setReceiptModalBill] = useState<Bill | null>(null);

  // Daily Report State
  const todayStr = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(todayStr);
  const [dailyBills, setDailyBills] = useState<Bill[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    consultationAmount: 0,
    pharmacyAmount: 0,
    count: 0,
  });
  const [dailyLoading, setDailyLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(console.error);

    loadDailyReport(todayStr);
    loadPharmacyMedicines();
  }, [todayStr]);

  const loadPharmacyMedicines = async () => {
    try {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (res.ok) {
        setAvailableMedicines(data.medicines || []);
      }
    } catch (err) {
      console.error('Error fetching pharmacy medicines:', err);
    }
  };

  // Lookup patient by ID
  const handleLookupPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!patientIdInput.trim()) return;

    setPatientSearchLoading(true);
    setPatientSearchError('');
    setSelectedPatient(null);
    setPatientBills([]);
    setBillMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientIdInput.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setPatientSearchError(data.error || 'Patient not found');
        return;
      }

      setSelectedPatient(data.patient);
      setPatientBills(data.bills || []);
    } catch (err: any) {
      setPatientSearchError('Error looking up patient: ' + err.message);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  // Bill Item management
  const addConsultationItem = () => {
    setBillItems((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        type: 'consultation',
        name: 'Doctor Consultation Fee',
        quantity: 1, // ALWAYS 1
        rate: 500,
        total: 500,
      },
    ]);
  };

  const addMedicineItem = () => {
    setBillItems((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        type: 'medicine',
        name: '',
        quantity: 1,
        rate: 0,
        total: 0,
      },
    ]);
  };

  const removeBillItem = (id: string) => {
    if (billItems.length <= 1) {
      setBillItems([
        {
          id: Date.now().toString(),
          type: 'consultation',
          name: 'Doctor Consultation Fee',
          quantity: 1,
          rate: 500,
          total: 500,
        },
      ]);
      return;
    }
    setBillItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectMedicine = (id: string, medName: string) => {
    const matched = availableMedicines.find(
      (m) => m.name.toLowerCase() === medName.trim().toLowerCase()
    );

    setBillItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (matched) {
          const rate = parseFloat(String(matched.rate)) || 0;
          const qty = it.quantity > 0 ? it.quantity : 1;
          return {
            ...it,
            name: matched.name,
            medicine_id: matched.medicine_id,
            batch_number: matched.batch_number,
            available_stock: matched.current_stock,
            rate,
            quantity: qty,
            total: Math.round(qty * rate * 100) / 100,
          };
        } else {
          return {
            ...it,
            name: medName,
            medicine_id: undefined,
            batch_number: undefined,
            available_stock: undefined,
            rate: 0,
            total: 0,
          };
        }
      })
    );
  };

  const handleUpdateQuantity = (id: string, qtyVal: number) => {
    const cleanQty = Math.max(1, qtyVal || 1);
    setBillItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          quantity: cleanQty,
          total: Math.round(cleanQty * it.rate * 100) / 100,
        };
      })
    );
  };

  const handleUpdateConsultationRate = (id: string, rateVal: number) => {
    const cleanRate = Math.max(0, rateVal || 0);
    setBillItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          quantity: 1, // strictly locked to 1
          rate: cleanRate,
          total: cleanRate,
        };
      })
    );
  };

  const handleUpdateItemName = (id: string, nameVal: string) => {
    setBillItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, name: nameVal } : it))
    );
  };

  // Calculations
  const consultationSubtotal = billItems
    .filter((it) => it.type === 'consultation')
    .reduce((sum, it) => sum + (it.total || 0), 0);

  const pharmacySubtotal = billItems
    .filter((it) => it.type === 'medicine')
    .reduce((sum, it) => sum + (it.total || 0), 0);

  const grandTotal = Math.round((consultationSubtotal + pharmacySubtotal) * 100) / 100;

  // Create New Itemized Bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setBillMessage({ type: 'error', text: 'Please look up a valid patient first.' });
      return;
    }

    if (billItems.length === 0) {
      setBillMessage({ type: 'error', text: 'Please add at least one item to the bill.' });
      return;
    }

    // Validate medicine items have names
    const invalidMed = billItems.find((it) => it.type === 'medicine' && !it.name.trim());
    if (invalidMed) {
      setBillMessage({ type: 'error', text: 'Please select a valid medicine for all medicine rows.' });
      return;
    }

    if (grandTotal <= 0) {
      setBillMessage({ type: 'error', text: 'Bill total amount must be greater than ₹0.' });
      return;
    }

    setBillLoading(true);
    setBillMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          amount: grandTotal,
          payment_mode: paymentMode,
          status,
          items: billItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBillMessage({ type: 'error', text: data.error || 'Failed to create bill' });
        setBillLoading(false);
        return;
      }

      setBillMessage({
        type: 'success',
        text: `Bill #${data.bill.bill_id} (₹${grandTotal.toFixed(2)}) generated successfully!`,
      });

      // Reset bill items to default consultation item
      setBillItems([
        {
          id: Date.now().toString(),
          type: 'consultation',
          name: 'Doctor Consultation Fee',
          quantity: 1,
          rate: 500,
          total: 500,
        },
      ]);

      // Refresh patient bills and daily report
      handleLookupPatient();
      loadDailyReport(reportDate);
      loadPharmacyMedicines();
    } catch (err: any) {
      setBillMessage({ type: 'error', text: 'Error generating bill: ' + err.message });
    } finally {
      setBillLoading(false);
    }
  };

  // Toggle status to Paid
  const handleMarkAsPaid = async (billId: number) => {
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' }),
      });
      if (res.ok) {
        setPatientBills((prev) =>
          prev.map((b) => (b.bill_id === billId ? { ...b, status: 'Paid' } : b))
        );
        loadDailyReport(reportDate);
        if (receiptModalBill && receiptModalBill.bill_id === billId) {
          setReceiptModalBill({ ...receiptModalBill, status: 'Paid' });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load daily report
  const loadDailyReport = async (dateVal: string) => {
    setDailyLoading(true);
    try {
      const res = await fetch(`/api/bills?date=${encodeURIComponent(dateVal)}`);
      const data = await res.json();
      if (res.ok) {
        setDailyBills(data.bills || []);
        setDailySummary(
          data.summary || {
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            consultationAmount: 0,
            pharmacyAmount: 0,
            count: 0,
          }
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDailyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Reception Desk</h1>
            <p className="text-sm text-gray-600">
              Itemized invoice generation with live pharmacy inventory rates, custom consultation fees, and revenue tracking.
            </p>
          </div>

          <div className="flex bg-white rounded-md border border-gray-300 p-0.5">
            <button
              onClick={() => setActiveTab('patient_billing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'patient_billing'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Patient Billing
            </button>
            <button
              onClick={() => setActiveTab('daily_report')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'daily_report'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Daily Report
            </button>
          </div>
        </div>

        {/* TAB 1: PATIENT BILLING */}
        {activeTab === 'patient_billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Patient Lookup & Itemized Bill Creation */}
            <div className="lg:col-span-7 space-y-6">
              {/* Lookup Card */}
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-3">
                  1. Search Patient by ID
                </h2>
                <form onSubmit={handleLookupPatient} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 202609070001"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={patientSearchLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                  >
                    {patientSearchLoading ? 'Looking up...' : 'Lookup'}
                  </button>
                </form>

                {patientSearchError && (
                  <div className="mt-3 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                    {patientSearchError}
                  </div>
                )}

                {selectedPatient && (
                  <div className="mt-4 p-3 bg-blue-50/80 rounded border border-blue-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-gray-900 text-sm">
                      <span>{selectedPatient.name}</span>
                      <span className="font-mono text-blue-700">{selectedPatient.patient_id}</span>
                    </div>
                    <div className="text-gray-600">
                      {selectedPatient.sex}, {selectedPatient.age} yrs • Phone: {selectedPatient.phone_number}
                    </div>
                    {selectedPatient.email && (
                      <div className="text-gray-500">Email: {selectedPatient.email}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Create Itemized Bill Card */}
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                      <span>2. Itemized Invoice Generator</span>
                      <span className="text-[11px] font-normal normal-case text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Pharmacy DB Connected ({availableMedicines.length} in stock)
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Add consultation fees with custom rate, or select medicines from pharmacy inventory with live DB rates.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addMedicineItem}
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span>+ Add Medicine</span>
                    </button>
                    <button
                      type="button"
                      onClick={addConsultationItem}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span>+ Add Consultation</span>
                    </button>
                  </div>
                </div>

                {billMessage.text && (
                  <div
                    className={`mb-4 p-2.5 rounded text-xs ${
                      billMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {billMessage.text}
                  </div>
                )}

                {/* Datalist for medicines in inventory */}
                <datalist id="billing-medicines-list">
                  {availableMedicines.map((m) => (
                    <option key={m.medicine_id} value={m.name}>
                      Rate: ₹{parseFloat(String(m.rate || 0)).toFixed(2)} | Stock: {m.current_stock} | Batch: {m.batch_number}
                    </option>
                  ))}
                </datalist>

                <form onSubmit={handleCreateBill} className="space-y-4">
                  {/* Bill Items List */}
                  <div className="space-y-3">
                    {billItems.map((item, index) => {
                      const isConsultation = item.type === 'consultation';
                      const matchedMed = !isConsultation
                        ? availableMedicines.find(
                            (m) => m.name.toLowerCase() === item.name.trim().toLowerCase()
                          )
                        : null;

                      const isLowOrZeroStock = matchedMed && matchedMed.current_stock <= 0;
                      const exceedsStock = matchedMed && item.quantity > matchedMed.current_stock;

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-lg border transition-all ${
                            isConsultation
                              ? 'bg-blue-50/40 border-blue-200'
                              : 'bg-purple-50/30 border-purple-200'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-gray-500">#{index + 1}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isConsultation
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-purple-100 text-purple-800 border border-purple-300'
                                }`}
                              >
                                {isConsultation ? 'Consultation Fee' : 'Pharmacy Medicine'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeBillItem(item.id)}
                              className="text-gray-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                              title="Remove item"
                            >
                              ✕ Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start text-xs">
                            {/* Item Name / Selector */}
                            <div className="sm:col-span-5">
                              <label className="block font-semibold text-gray-700 uppercase mb-1 text-[11px]">
                                {isConsultation ? 'Item Description' : 'Medicine (from Inventory) *'}
                              </label>

                              {isConsultation ? (
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                                  placeholder="e.g. Doctor Consultation Fee"
                                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                              ) : (
                                <div>
                                  <input
                                    type="text"
                                    required
                                    list="billing-medicines-list"
                                    placeholder="Search medicine in stock..."
                                    value={item.name}
                                    onChange={(e) => handleSelectMedicine(item.id, e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
                                  />
                                  {matchedMed ? (
                                    <div className="text-[11px] mt-1 flex flex-wrap justify-between gap-1 text-emerald-800 font-medium">
                                      <span>
                                        Stock: <strong>{matchedMed.current_stock}</strong> units
                                      </span>
                                      <span className="text-gray-500">Batch: {matchedMed.batch_number}</span>
                                    </div>
                                  ) : item.name.trim() ? (
                                    <div className="text-[11px] text-amber-700 mt-1">
                                      Not found in stock. Rate: ₹0.00
                                    </div>
                                  ) : null}

                                  {exceedsStock && (
                                    <div className="text-[11px] text-red-600 mt-0.5 font-semibold">
                                      Warning: Quantity exceeds current pharmacy stock!
                                    </div>
                                  )}
                                  {isLowOrZeroStock && (
                                    <div className="text-[11px] text-red-600 mt-0.5 font-semibold">
                                      Warning: This medicine is currently out of stock!
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Quantity */}
                            <div className="sm:col-span-2">
                              <label className="block font-semibold text-gray-700 uppercase mb-1 text-[11px]">
                                Quantity
                              </label>
                              {isConsultation ? (
                                <div>
                                  <input
                                    type="number"
                                    value={1}
                                    disabled
                                    readOnly
                                    className="w-full px-2 py-1.5 border border-gray-200 bg-gray-100/80 rounded text-xs text-center text-gray-700 font-bold cursor-not-allowed"
                                  />
                                  <span className="text-[10px] text-gray-400 block text-center mt-0.5">
                                    Locked (1)
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <input
                                    type="number"
                                    min="1"
                                    required
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleUpdateQuantity(item.id, parseInt(e.target.value, 10))
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-300 bg-white rounded text-xs text-center text-gray-900 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                  />
                                  <span className="text-[10px] text-gray-400 block text-center mt-0.5">
                                    units
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Rate (₹) */}
                            <div className="sm:col-span-2">
                              <label className="block font-semibold text-gray-700 uppercase mb-1 text-[11px]">
                                Rate (₹)
                              </label>
                              {isConsultation ? (
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    placeholder="500"
                                    value={item.rate === 0 ? '' : item.rate}
                                    onChange={(e) =>
                                      handleUpdateConsultationRate(
                                        item.id,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-full px-2 py-1.5 border border-blue-300 bg-white rounded text-xs text-right text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                  <span className="text-[10px] text-blue-600 block text-right mt-0.5">
                                    Custom entry
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={`₹${item.rate.toFixed(2)}`}
                                    className="w-full px-2 py-1.5 border border-gray-200 bg-gray-100 rounded text-xs text-right text-gray-700 font-bold cursor-not-allowed"
                                  />
                                  <span className="text-[10px] text-emerald-700 block text-right mt-0.5">
                                    From DB
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Line Total */}
                            <div className="sm:col-span-3">
                              <label className="block font-semibold text-gray-700 uppercase mb-1 text-[11px] text-right">
                                Total Cost (₹)
                              </label>
                              <div className="py-1.5 px-2 bg-white/80 border border-gray-200 rounded text-right font-extrabold text-sm text-gray-900">
                                ₹{item.total.toFixed(2)}
                              </div>
                              <span className="text-[10px] text-gray-400 block text-right mt-0.5">
                                {item.quantity} &times; ₹{item.rate.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Breakdown Box */}
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Consultation Total:</span>
                      <span className="font-semibold text-gray-900">₹{consultationSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Pharmacy Medicines Total:</span>
                      <span className="font-semibold text-gray-900">₹{pharmacySubtotal.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-gray-900 uppercase">Grand Total:</span>
                      <span className="text-xl font-extrabold text-emerald-700">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-gray-700 uppercase mb-1">
                        Payment Mode *
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Credit / Debit Card</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 uppercase mb-1">
                        Payment Status *
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={billLoading || !selectedPatient || grandTotal <= 0}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded shadow-sm transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {billLoading ? (
                      'Generating Invoice...'
                    ) : (
                      <span>Save &amp; Issue Bill • ₹{grandTotal.toFixed(2)}</span>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Patient Bill History */}
            <div className="lg:col-span-5">
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-gray-900">
                    Patient Bill History {selectedPatient && `(${selectedPatient.name})`}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {patientBills.length} {patientBills.length === 1 ? 'bill' : 'bills'}
                  </span>
                </div>

                {!selectedPatient ? (
                  <div className="text-center py-12 text-sm text-gray-500">
                    Search and select a patient on the left to inspect their bill records.
                  </div>
                ) : patientBills.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500">
                    No bills recorded for this patient yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                        <tr>
                          <th className="px-3 py-2.5 text-left">Bill ID</th>
                          <th className="px-3 py-2.5 text-left">Type</th>
                          <th className="px-3 py-2.5 text-left">Amount</th>
                          <th className="px-3 py-2.5 text-left">Status</th>
                          <th className="px-3 py-2.5 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {patientBills.map((b) => (
                          <tr key={b.bill_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-gray-900 font-medium">#{b.bill_id}</span>
                              <span className="text-[11px] text-gray-400 block">
                                {new Date(b.date).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-medium text-gray-800">{b.billing_type}</span>
                              <span className="text-[11px] text-gray-400 block">{b.payment_mode}</span>
                            </td>
                            <td className="px-3 py-2.5 font-bold text-gray-900">₹{b.amount}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  b.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 space-x-1">
                              <button
                                onClick={() => setReceiptModalBill(b)}
                                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded font-medium transition-colors"
                              >
                                Receipt
                              </button>
                              {b.status === 'Pending' && (
                                <button
                                  onClick={() => handleMarkAsPaid(b.bill_id)}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded font-medium"
                                >
                                  Pay
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DAILY BILL REPORT */}
        {activeTab === 'daily_report' && (
          <div className="space-y-6">
            {/* Filter Header */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="reportDate" className="text-xs font-bold uppercase text-gray-700">
                  Filter Date:
                </label>
                <input
                  id="reportDate"
                  type="date"
                  value={reportDate}
                  onChange={(e) => {
                    setReportDate(e.target.value);
                    loadDailyReport(e.target.value);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="text-xs text-gray-500">
                Displaying daily collections and transaction breakdown for {reportDate}
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-gray-500 uppercase">Total Billed</span>
                <div className="text-xl font-bold text-gray-900 mt-1">₹{dailySummary.totalAmount.toFixed(2)}</div>
                <span className="text-xs text-gray-400">{dailySummary.count} total bills</span>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-emerald-600 uppercase">Collected (Paid)</span>
                <div className="text-xl font-bold text-emerald-700 mt-1">₹{dailySummary.paidAmount.toFixed(2)}</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-amber-600 uppercase">Pending</span>
                <div className="text-xl font-bold text-amber-700 mt-1">₹{dailySummary.pendingAmount.toFixed(2)}</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-blue-600 uppercase">Consultations</span>
                <div className="text-xl font-bold text-blue-700 mt-1">₹{dailySummary.consultationAmount.toFixed(2)}</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-purple-600 uppercase">Pharmacy Sales</span>
                <div className="text-xl font-bold text-purple-700 mt-1">₹{dailySummary.pharmacyAmount.toFixed(2)}</div>
              </div>
            </div>

            {/* Bills Table for Date */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Detailed Bills for {reportDate} ({dailyBills.length})
              </h3>

              {dailyLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading daily bills...</div>
              ) : dailyBills.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">
                  No bills registered for this date.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Bill ID</th>
                        <th className="px-3 py-2.5 text-left">Patient ID</th>
                        <th className="px-3 py-2.5 text-left">Patient Name</th>
                        <th className="px-3 py-2.5 text-left">Type</th>
                        <th className="px-3 py-2.5 text-left">Amount</th>
                        <th className="px-3 py-2.5 text-left">Mode</th>
                        <th className="px-3 py-2.5 text-left">Status</th>
                        <th className="px-3 py-2.5 text-left">Handled By</th>
                        <th className="px-3 py-2.5 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {dailyBills.map((b) => (
                        <tr key={b.bill_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-mono text-gray-900 font-medium">#{b.bill_id}</td>
                          <td className="px-3 py-2.5 font-mono text-blue-700">{b.patient_id}</td>
                          <td className="px-3 py-2.5 font-semibold text-gray-900">{b.patient_name || '—'}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-800">{b.billing_type}</td>
                          <td className="px-3 py-2.5 font-bold text-gray-900">₹{b.amount}</td>
                          <td className="px-3 py-2.5 text-gray-600">{b.payment_mode}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                b.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">{b.handled_by_name || 'Staff'}</td>
                          <td className="px-3 py-2.5 space-x-1">
                            <button
                              onClick={() => setReceiptModalBill(b)}
                              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded font-medium transition-colors"
                            >
                              Receipt
                            </button>
                            {b.status === 'Pending' && (
                              <button
                                onClick={() => handleMarkAsPaid(b.bill_id)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded font-medium"
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ITEMIZED RECEIPT MODAL */}
        {receiptModalBill && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 space-y-4">
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">DVS Clinic - Invoice Receipt</h3>
                  <p className="text-xs text-gray-500">
                    Official patient billing receipt &amp; breakdown
                  </p>
                </div>
                <button
                  onClick={() => setReceiptModalBill(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 text-base font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Receipt Meta */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 block">Bill Number:</span>
                  <span className="font-mono font-bold text-gray-900">#{receiptModalBill.bill_id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Date &amp; Time:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(receiptModalBill.date).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Patient Name:</span>
                  <span className="font-semibold text-gray-900">
                    {receiptModalBill.patient_name || selectedPatient?.name || 'Patient'}
                  </span>
                  <span className="font-mono text-blue-700 block text-[11px]">
                    ID: {receiptModalBill.patient_id}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Payment Mode &amp; Status:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-gray-800">{receiptModalBill.payment_mode}</span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        receiptModalBill.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {receiptModalBill.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Line Items
                </h4>

                {(() => {
                  let itemsList: any[] = [];
                  if (typeof receiptModalBill.items === 'string') {
                    try {
                      itemsList = JSON.parse(receiptModalBill.items);
                    } catch (e) {}
                  } else if (Array.isArray(receiptModalBill.items)) {
                    itemsList = receiptModalBill.items;
                  }

                  if (itemsList && itemsList.length > 0) {
                    return (
                      <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                            <tr>
                              <th className="px-3 py-2 text-left">Item Description</th>
                              <th className="px-3 py-2 text-center">Qty</th>
                              <th className="px-3 py-2 text-right">Rate</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {itemsList.map((it: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-gray-900">{it.name}</div>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                      it.type === 'consultation'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {it.type === 'consultation' ? 'Consultation' : 'Medicine'}
                                  </span>
                                  {it.batch_number && (
                                    <span className="text-[10px] text-gray-400 ml-1.5">
                                      Batch: {it.batch_number}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-gray-800">
                                  {it.quantity}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                  ₹{parseFloat(it.rate || 0).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-gray-900">
                                  ₹{parseFloat(it.total || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs flex justify-between items-center">
                        <span className="font-medium text-gray-700">
                          {receiptModalBill.billing_type} Fee
                        </span>
                        <span className="font-bold text-gray-900">₹{receiptModalBill.amount}</span>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Total Amount Footer */}
              <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-900 uppercase">Total Paid / Billed:</span>
                <span className="text-2xl font-extrabold text-emerald-700">
                  ₹{parseFloat(receiptModalBill.amount).toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptModalBill(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
