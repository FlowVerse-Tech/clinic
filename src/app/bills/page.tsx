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

  // Create Bill Form
  const [billingType, setBillingType] = useState<'Consultation' | 'Pharmacy'>('Consultation');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [status, setStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [billLoading, setBillLoading] = useState(false);
  const [billMessage, setBillMessage] = useState({ type: '', text: '' });

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
  }, [todayStr]);

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

  // Create New Bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setBillMessage({ type: 'error', text: 'Please look up a valid patient first.' });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setBillMessage({ type: 'error', text: 'Please enter a valid bill amount.' });
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
          billing_type: billingType,
          amount: parseFloat(amount),
          payment_mode: paymentMode,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBillMessage({ type: 'error', text: data.error || 'Failed to create bill' });
        setBillLoading(false);
        return;
      }

      setBillMessage({ type: 'success', text: `Bill #${data.bill.bill_id} generated successfully!` });
      setAmount('');
      // Refresh patient bills
      handleLookupPatient();
      // Refresh daily report
      loadDailyReport(reportDate);
    } catch (err: any) {
      setBillMessage({ type: 'error', text: 'Error generating bill' });
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
        // Refresh local lists
        setPatientBills((prev) =>
          prev.map((b) => (b.bill_id === billId ? { ...b, status: 'Paid' } : b))
        );
        loadDailyReport(reportDate);
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
        setDailySummary(data.summary || {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          consultationAmount: 0,
          pharmacyAmount: 0,
          count: 0,
        });
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
            <p className="text-sm text-gray-600">Generate bills, track consultation/pharmacy receipts, and review daily revenue.</p>
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
            {/* Left Column: Patient Lookup & Bill Creation */}
            <div className="lg:col-span-5 space-y-6">
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
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-xs space-y-1">
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

              {/* Create Bill Card */}
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-3">
                  2. Create New Bill
                </h2>

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

                <form onSubmit={handleCreateBill} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 uppercase mb-1">
                      Billing Type *
                    </label>
                    <select
                      value={billingType}
                      onChange={(e) => setBillingType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
                    >
                      <option value="Consultation">Consultation Fee</option>
                      <option value="Pharmacy">Pharmacy / Medicines</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 uppercase mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      placeholder="e.g. 500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                        Status *
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
                    disabled={billLoading || !selectedPatient}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded transition-colors disabled:opacity-50 mt-2"
                  >
                    {billLoading ? 'Generating...' : 'Save & Issue Bill'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Patient Bill History */}
            <div className="lg:col-span-7">
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
                          <th className="px-3 py-2.5 text-left">Date</th>
                          <th className="px-3 py-2.5 text-left">Type</th>
                          <th className="px-3 py-2.5 text-left">Amount</th>
                          <th className="px-3 py-2.5 text-left">Payment Mode</th>
                          <th className="px-3 py-2.5 text-left">Status</th>
                          <th className="px-3 py-2.5 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {patientBills.map((b) => (
                          <tr key={b.bill_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5 font-mono text-gray-900 font-medium">#{b.bill_id}</td>
                            <td className="px-3 py-2.5 text-gray-600">{new Date(b.date).toLocaleDateString()}</td>
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
                            <td className="px-3 py-2.5">
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
          </div>
        )}

        {/* TAB 2: DAILY BILL REPORT */}
        {activeTab === 'daily_report' && (
          <div className="space-y-6">
            {/* Filter Header */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="reportDate" className="text-xs font-bold uppercase text-gray-700">Filter Date:</label>
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
                          <td className="px-3 py-2.5">
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
      </main>
    </div>
  );
}
