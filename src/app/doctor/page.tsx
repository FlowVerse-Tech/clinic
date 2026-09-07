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
  description: string | null;
  family_history: string | null;
  past_medical_history: string | null;
  created_at: string;
}

interface Visit {
  visit_id: number;
  patient_id: string;
  visit_date: string;
  on_examination: string;
  current_symptoms: string;
  diagnosis: string;
  current_prescription: string;
}

interface Report {
  report_id: number;
  patient_id: string;
  file_url: string;
  report_type: string;
  uploaded_at: string;
}

interface Bill {
  bill_id: number;
  patient_id: string;
  date: string;
  billing_type: string;
  amount: string;
  payment_mode: string;
  status: string;
  handled_by_name?: string;
}

interface DispensedMedicine {
  transaction_id: number;
  medicine_name: string;
  batch_number: string;
  quantity: number;
  date: string;
}

interface MedicineOption {
  medicine_id: number;
  name: string;
  batch_number: string;
  current_stock: number;
  expiry_date: string;
}

interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  timing: string;
  durationDays: string;
  instructions?: string;
}

export default function DoctorPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Search and selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Relational details for selected patient
  const [visits, setVisits] = useState<Visit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dispensedMeds, setDispensedMeds] = useState<DispensedMedicine[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Available medicines from pharmacy
  const [availableMedicines, setAvailableMedicines] = useState<MedicineOption[]>([]);

  // Prescription Items structured form
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      id: '1',
      medicineName: '',
      dosage: '1-0-1',
      timing: 'After Food',
      durationDays: '3',
      instructions: '',
    },
  ]);

  // Tabs for patient view
  const [activeTab, setActiveTab] = useState<'new_visit' | 'visits' | 'reports' | 'bills_pharmacy'>('new_visit');

  // New Patient Modal state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    age: '',
    sex: 'Male',
    phone_number: '',
    email: '',
    description: '',
    family_history: '',
    past_medical_history: '',
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // New Visit Form state
  const [visitForm, setVisitForm] = useState({
    on_examination: '',
    current_symptoms: '',
    diagnosis: '',
    current_prescription: '',
  });
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitMessage, setVisitMessage] = useState({ type: '', text: '' });

  // Report Upload state
  const [reportType, setReportType] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' });

  // Load current session & medicines
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(console.error);

    loadPharmacyMedicines();

    // Initial search/list of recent patients
    handleSearch('');
  }, []);

  const loadPharmacyMedicines = async () => {
    try {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (res.ok) {
        setAvailableMedicines(data.medicines || []);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    }
  };

  const handleSearch = async (queryStr: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(queryStr)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.patients || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = async (p: Patient) => {
    setSelectedPatient(p);
    setLoadingDetails(true);
    setActiveTab('new_visit');
    setVisitMessage({ type: '', text: '' });
    setUploadMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/patients/${p.patient_id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedPatient(data.patient);
        setVisits(data.visits || []);
        setReports(data.reports || []);
        setBills(data.bills || []);
        setDispensedMeds(data.dispensed_medicines || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Register New Patient
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    // Basic validation
    if (!regForm.name.trim() || !regForm.age || !regForm.phone_number.trim()) {
      setRegError('Name, Age, and Phone Number are required fields.');
      return;
    }

    if (regForm.email && !/^\S+@\S+\.\S+$/.test(regForm.email)) {
      setRegError('Please provide a valid email address.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Registration failed');
        setRegLoading(false);
        return;
      }

      const newPatient = data.patient;
      setRegSuccess(`Patient registered! ID: ${newPatient.patient_id}`);
      // Refresh list
      handleSearch(newPatient.patient_id);
      // Automatically select newly registered patient
      selectPatient(newPatient);

      setTimeout(() => {
        setShowRegModal(false);
        setRegSuccess('');
        setRegForm({
          name: '',
          age: '',
          sex: 'Male',
          phone_number: '',
          email: '',
          description: '',
          family_history: '',
          past_medical_history: '',
        });
      }, 1200);
    } catch (err: any) {
      setRegError('Network error: ' + err.message);
    } finally {
      setRegLoading(false);
    }
  };

  // Prescription helpers
  const addPrescriptionItem = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        medicineName: '',
        dosage: '1-0-1',
        timing: 'After Food',
        durationDays: '3',
        instructions: '',
      },
    ]);
  };

  const removePrescriptionItem = (id: string) => {
    if (prescriptionItems.length <= 1) {
      setPrescriptionItems([
        {
          id: Date.now().toString(),
          medicineName: '',
          dosage: '1-0-1',
          timing: 'After Food',
          durationDays: '3',
          instructions: '',
        },
      ]);
      return;
    }
    setPrescriptionItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updatePrescriptionItem = (id: string, field: keyof PrescriptionItem, value: string) => {
    setPrescriptionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const formatPrescriptionText = (items: PrescriptionItem[], additionalNotes?: string): string => {
    const validItems = items.filter((item) => item.medicineName.trim().length > 0);
    const lines: string[] = [];

    validItems.forEach((it, idx) => {
      let line = `${idx + 1}. ${it.medicineName.trim()} | Dosage: ${it.dosage} | ${it.timing} | Duration: ${it.durationDays} days`;
      if (it.instructions?.trim()) {
        line += ` (${it.instructions.trim()})`;
      }
      lines.push(line);
    });

    let result = lines.join('\n');
    if (additionalNotes?.trim()) {
      result = result
        ? `${result}\n\nAdditional Advice / Instructions:\n${additionalNotes.trim()}`
        : additionalNotes.trim();
    }
    return result;
  };

  // Record New Visit
  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setVisitLoading(true);
    setVisitMessage({ type: '', text: '' });

    const finalPrescription = formatPrescriptionText(
      prescriptionItems,
      visitForm.current_prescription
    );

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          on_examination: visitForm.on_examination,
          current_symptoms: visitForm.current_symptoms,
          diagnosis: visitForm.diagnosis,
          current_prescription: finalPrescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setVisitMessage({ type: 'error', text: data.error || 'Failed to save visit' });
        setVisitLoading(false);
        return;
      }

      setVisitMessage({ type: 'success', text: 'Visit recorded successfully!' });
      // Prepend visit to list
      setVisits([data.visit, ...visits]);
      setVisitForm({
        on_examination: '',
        current_symptoms: '',
        diagnosis: '',
        current_prescription: '',
      });
      setPrescriptionItems([
        {
          id: Date.now().toString(),
          medicineName: '',
          dosage: '1-0-1',
          timing: 'After Food',
          durationDays: '3',
          instructions: '',
        },
      ]);
    } catch (err: any) {
      setVisitMessage({ type: 'error', text: 'Error saving visit' });
    } finally {
      setVisitLoading(false);
    }
  };

  // Upload Medical Report
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !reportFile || !reportType.trim()) {
      setUploadMessage({ type: 'error', text: 'Select a report type and a file to upload.' });
      return;
    }

    setUploadLoading(true);
    setUploadMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('patient_id', selectedPatient.patient_id);
      formData.append('report_type', reportType);
      formData.append('file', reportFile);

      const res = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadMessage({ type: 'error', text: data.error || 'Upload failed' });
        setUploadLoading(false);
        return;
      }

      setUploadMessage({ type: 'success', text: 'Report uploaded successfully!' });
      setReports([data.report, ...reports]);
      setReportType('');
      setReportFile(null);
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: 'Error uploading report' });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Consultation Desk</h1>
            <p className="text-sm text-gray-600">Search patients, record visits, view clinical history, and upload diagnostic reports.</p>
          </div>
          <button
            onClick={() => setShowRegModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
          >
            + Register New Patient
          </button>
        </div>

        {/* 2-Column Layout: Left Search/List, Right Patient Details & Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Patient Search & List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label htmlFor="searchQuery" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Patient Search
              </label>
              <div className="flex gap-2">
                <input
                  id="searchQuery"
                  type="text"
                  placeholder="ID, Name, or Phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleSearch(searchQuery)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs font-medium rounded-md text-gray-700"
                >
                  Search
                </button>
              </div>

              {/* Patient List */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex justify-between">
                  <span>Results ({searchResults.length})</span>
                  {searching && <span className="text-blue-500">Searching...</span>}
                </div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-md">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                      No patients found. Click &quot;+ Register New Patient&quot; above.
                    </div>
                  ) : (
                    searchResults.map((p) => {
                      const isSelected = selectedPatient?.patient_id === p.patient_id;
                      return (
                        <div
                          key={p.patient_id}
                          onClick={() => selectPatient(p)}
                          className={`p-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-l-4 border-blue-600'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                            <span className="font-mono text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                              {p.patient_id}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex gap-2">
                            <span>{p.sex}, {p.age} yrs</span>
                            <span>•</span>
                            <span>{p.phone_number}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Selected Patient Details & Tabs */}
          <div className="lg:col-span-8">
            {!selectedPatient ? (
              <div className="bg-white p-12 rounded-lg border border-gray-200 text-center text-gray-500 shadow-sm">
                <div className="text-lg font-medium text-gray-700 mb-1">No Patient Selected</div>
                <p className="text-sm">Select a patient from the left panel or register a new one to begin consultation.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Patient Profile Card */}
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-3 mb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{selectedPatient.name}</h2>
                        <span className="font-mono text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                          ID: {selectedPatient.patient_id}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span><strong>Age/Sex:</strong> {selectedPatient.age} yrs, {selectedPatient.sex}</span>
                        <span><strong>Phone:</strong> {selectedPatient.phone_number}</span>
                        {selectedPatient.email && <span><strong>Email:</strong> {selectedPatient.email}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Medical Background */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-gray-50 p-3 rounded border border-gray-200">
                    <div>
                      <span className="font-semibold text-gray-700 block mb-0.5">Past Medical History:</span>
                      <p className="text-gray-600">{selectedPatient.past_medical_history || 'None noted'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700 block mb-0.5">Family History:</span>
                      <p className="text-gray-600">{selectedPatient.family_history || 'None noted'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700 block mb-0.5">General Notes / Description:</span>
                      <p className="text-gray-600">{selectedPatient.description || 'None noted'}</p>
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                      onClick={() => setActiveTab('new_visit')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'new_visit'
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Record New Visit
                    </button>
                    <button
                      onClick={() => setActiveTab('visits')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'visits'
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Past Visits ({visits.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('reports')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'reports'
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Reports ({reports.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('bills_pharmacy')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'bills_pharmacy'
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Bills &amp; Dispensed Meds ({bills.length + dispensedMeds.length})
                    </button>
                  </div>

                  <div className="p-6">
                    {loadingDetails ? (
                      <div className="text-center py-8 text-sm text-gray-500">Loading patient data...</div>
                    ) : (
                      <>
                        {/* TAB 1: RECORD NEW VISIT */}
                        {activeTab === 'new_visit' && (
                          <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Record New Patient Visit</h3>
                            {visitMessage.text && (
                              <div
                                className={`mb-4 p-3 rounded text-sm ${
                                  visitMessage.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                                }`}
                              >
                                {visitMessage.text}
                              </div>
                            )}

                            <form onSubmit={handleSaveVisit} className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                  Current Symptoms
                                </label>
                                <textarea
                                  rows={2}
                                  value={visitForm.current_symptoms}
                                  onChange={(e) =>
                                    setVisitForm({ ...visitForm, current_symptoms: e.target.value })
                                  }
                                  placeholder="e.g. High fever for 3 days, dry cough, headache"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                  On Examination (O/E)
                                </label>
                                <textarea
                                  rows={2}
                                  value={visitForm.on_examination}
                                  onChange={(e) =>
                                    setVisitForm({ ...visitForm, on_examination: e.target.value })
                                  }
                                  placeholder="e.g. BP: 120/80 mmHg, Pulse: 78 bpm, Chest clear, Throat congested"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                  Diagnosis
                                </label>
                                <textarea
                                  rows={2}
                                  value={visitForm.diagnosis}
                                  onChange={(e) =>
                                    setVisitForm({ ...visitForm, diagnosis: e.target.value })
                                  }
                                  placeholder="e.g. Acute Viral Upper Respiratory Tract Infection"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Structured Prescription Form */}
                              <div className="bg-blue-50/40 p-4 rounded-lg border border-blue-200 space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-blue-100 pb-3">
                                  <div>
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                      <span>Prescription &amp; Medications</span>
                                      <span className="text-xs font-normal text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                        Derived from Pharmacy Stock ({availableMedicines.length} in stock)
                                      </span>
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                      Select medicines from pharmacy inventory, specify dosage (like 1-0-1), food timing, and duration.
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={addPrescriptionItem}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition-colors"
                                  >
                                    + Add Medicine
                                  </button>
                                </div>

                                {/* Datalists for medicines and dosage */}
                                <datalist id="pharmacy-medicines-list">
                                  {availableMedicines.map((m) => (
                                    <option key={m.medicine_id} value={m.name}>
                                      Stock: {m.current_stock} | Batch: {m.batch_number} | Exp: {new Date(m.expiry_date).toLocaleDateString()}
                                    </option>
                                  ))}
                                </datalist>

                                <datalist id="dosage-presets">
                                  <option value="1-0-1" />
                                  <option value="1-0-0" />
                                  <option value="0-1-0" />
                                  <option value="0-0-1" />
                                  <option value="1-1-1" />
                                  <option value="1-1-0" />
                                  <option value="0-1-1" />
                                  <option value="1/2-0-1/2" />
                                  <option value="SOS / As Needed" />
                                </datalist>

                                {/* List of Prescription Rows */}
                                <div className="space-y-3">
                                  {prescriptionItems.map((item) => {
                                    const matchedMed = availableMedicines.find(
                                      (m) => m.name.toLowerCase() === item.medicineName.trim().toLowerCase()
                                    );

                                    return (
                                      <div
                                        key={item.id}
                                        className="p-3 bg-white border border-gray-200 rounded-md shadow-xs space-y-2"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                          {/* Medicine Selection */}
                                          <div className="md:col-span-4">
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                              Medicine Name *
                                            </label>
                                            <input
                                              type="text"
                                              required
                                              list="pharmacy-medicines-list"
                                              placeholder="Select or type medicine..."
                                              value={item.medicineName}
                                              onChange={(e) =>
                                                updatePrescriptionItem(item.id, 'medicineName', e.target.value)
                                              }
                                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            {matchedMed ? (
                                              <div className="text-[11px] text-emerald-700 flex items-center justify-between mt-1">
                                                <span>In Pharmacy: <strong>{matchedMed.current_stock} units</strong></span>
                                                <span className="text-gray-400">Exp: {new Date(matchedMed.expiry_date).toLocaleDateString()}</span>
                                              </div>
                                            ) : item.medicineName.trim() ? (
                                              <div className="text-[11px] text-amber-700 mt-1">
                                                Not currently in pharmacy stock
                                              </div>
                                            ) : (
                                              <div className="text-[11px] text-gray-400 mt-1">
                                                Pick from pharmacy list or type
                                              </div>
                                            )}
                                          </div>

                                          {/* Dosage (like 1-0-1 format) */}
                                          <div className="md:col-span-2">
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                              Dosage *
                                            </label>
                                            <input
                                              type="text"
                                              required
                                              list="dosage-presets"
                                              placeholder="e.g. 1-0-1"
                                              value={item.dosage}
                                              onChange={(e) =>
                                                updatePrescriptionItem(item.id, 'dosage', e.target.value)
                                              }
                                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <span className="text-[10px] text-gray-400">e.g. 1-0-1, 1-0-0</span>
                                          </div>

                                          {/* Food Timing Dropdown */}
                                          <div className="md:col-span-3">
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                              Food Timing *
                                            </label>
                                            <select
                                              value={item.timing}
                                              onChange={(e) =>
                                                updatePrescriptionItem(item.id, 'timing', e.target.value)
                                              }
                                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
                                            >
                                              <option value="After Food">After Food</option>
                                              <option value="Before Food">Before Food</option>
                                              <option value="With Food">With Food</option>
                                              <option value="Empty Stomach">Empty Stomach</option>
                                              <option value="At Bedtime">At Bedtime</option>
                                            </select>
                                          </div>

                                          {/* Duration of Days */}
                                          <div className="md:col-span-2">
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                              Duration *
                                            </label>
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="number"
                                                required
                                                min="1"
                                                max="180"
                                                placeholder="3"
                                                value={item.durationDays}
                                                onChange={(e) =>
                                                  updatePrescriptionItem(item.id, 'durationDays', e.target.value)
                                                }
                                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                              />
                                              <span className="text-xs text-gray-500">days</span>
                                            </div>
                                          </div>

                                          {/* Remove Row Button */}
                                          <div className="md:col-span-1 flex justify-center items-center pt-5">
                                            <button
                                              type="button"
                                              onClick={() => removePrescriptionItem(item.id)}
                                              title="Remove item"
                                              className="text-gray-400 hover:text-red-600 text-sm font-bold p-1 rounded hover:bg-red-50 transition-colors"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>

                                        {/* Optional specific instructions for this medicine */}
                                        <div className="pt-1">
                                          <input
                                            type="text"
                                            placeholder="Optional note for this drug (e.g. take with warm water, avoid dairy)"
                                            value={item.instructions || ''}
                                            onChange={(e) =>
                                              updatePrescriptionItem(item.id, 'instructions', e.target.value)
                                            }
                                            className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded text-gray-700 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-gray-50/50"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Preview of formatted prescription */}
                                {prescriptionItems.some((it) => it.medicineName.trim().length > 0) && (
                                  <div className="p-2.5 bg-white rounded border border-blue-100 text-xs">
                                    <span className="font-bold text-blue-900 block mb-1">Prescription Preview:</span>
                                    <pre className="text-gray-800 font-mono text-[11px] whitespace-pre-wrap">
                                      {formatPrescriptionText(prescriptionItems)}
                                    </pre>
                                  </div>
                                )}

                                {/* Additional Doctor's Advice */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Additional Clinical Advice / Dietary Instructions (Optional)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={visitForm.current_prescription}
                                    onChange={(e) =>
                                      setVisitForm({ ...visitForm, current_prescription: e.target.value })
                                    }
                                    placeholder="e.g. Adequate rest, hydrate frequently, review in 3 days if fever persists"
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  />
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="submit"
                                  disabled={visitLoading}
                                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
                                >
                                  {visitLoading ? 'Saving Visit...' : 'Save Visit Record'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* TAB 2: PAST VISITS */}
                        {activeTab === 'visits' && (
                          <div className="space-y-4">
                            <h3 className="text-base font-semibold text-gray-900 mb-2">Visit History</h3>
                            {visits.length === 0 ? (
                              <p className="text-sm text-gray-500">No recorded visits for this patient yet.</p>
                            ) : (
                              <div className="space-y-4">
                                {visits.map((v) => (
                                  <div key={v.visit_id} className="p-4 border border-gray-200 rounded-lg bg-white shadow-xs">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                                      <span className="text-xs font-semibold text-blue-700 uppercase">
                                        Visit #{v.visit_id}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(v.visit_date).toLocaleString()}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-2">
                                      <div>
                                        <span className="text-xs font-bold text-gray-600 block">Symptoms:</span>
                                        <p className="text-gray-800">{v.current_symptoms || '—'}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-gray-600 block">On Examination (O/E):</span>
                                        <p className="text-gray-800">{v.on_examination || '—'}</p>
                                      </div>
                                    </div>

                                    <div className="mt-2 text-sm">
                                      <span className="text-xs font-bold text-gray-600 block">Diagnosis:</span>
                                      <p className="text-gray-900 font-medium">{v.diagnosis || '—'}</p>
                                    </div>

                                    <div className="mt-2 text-sm bg-gray-50 p-2.5 rounded border border-gray-200">
                                      <span className="text-xs font-bold text-gray-700 block mb-1">Prescription:</span>
                                      <pre className="text-xs text-gray-900 font-mono whitespace-pre-wrap">
                                        {v.current_prescription || 'None'}
                                      </pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 3: REPORTS */}
                        {activeTab === 'reports' && (
                          <div className="space-y-6">
                            {/* Upload New Report Form */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Patient Report</h3>
                              {uploadMessage.text && (
                                <div
                                  className={`mb-3 p-2.5 rounded text-xs ${
                                    uploadMessage.type === 'success'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-red-50 text-red-800 border border-red-200'
                                  }`}
                                >
                                  {uploadMessage.text}
                                </div>
                              )}

                              <form onSubmit={handleUploadReport} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Report Type / Tag
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Blood Test, X-Ray, MRI..."
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    File
                                  </label>
                                  <input
                                    type="file"
                                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                  />
                                </div>

                                <div>
                                  <button
                                    type="submit"
                                    disabled={uploadLoading}
                                    className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                                  >
                                    {uploadLoading ? 'Uploading...' : 'Upload Report'}
                                  </button>
                                </div>
                              </form>
                            </div>

                            {/* Reports List */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Uploaded Reports ({reports.length})</h4>
                              {reports.length === 0 ? (
                                <p className="text-sm text-gray-500">No reports uploaded yet.</p>
                              ) : (
                                <div className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden bg-white">
                                  {reports.map((r) => (
                                    <div key={r.report_id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                      <div>
                                        <span className="font-semibold text-sm text-gray-900 mr-2">{r.report_type}</span>
                                        <span className="text-xs text-gray-400">
                                          Uploaded: {new Date(r.uploaded_at).toLocaleString()}
                                        </span>
                                      </div>
                                      <a
                                        href={r.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded border border-blue-200"
                                      >
                                        View / Download
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB 4: BILLS & PHARMACY HISTORY */}
                        {activeTab === 'bills_pharmacy' && (
                          <div className="space-y-6">
                            {/* Bills Table */}
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">Billing History (From /bills)</h3>
                              {bills.length === 0 ? (
                                <p className="text-xs text-gray-500">No billing records found for this patient.</p>
                              ) : (
                                <div className="overflow-x-auto border border-gray-200 rounded-md">
                                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Bill ID</th>
                                        <th className="px-3 py-2 text-left">Date</th>
                                        <th className="px-3 py-2 text-left">Type</th>
                                        <th className="px-3 py-2 text-left">Amount</th>
                                        <th className="px-3 py-2 text-left">Mode</th>
                                        <th className="px-3 py-2 text-left">Status</th>
                                        <th className="px-3 py-2 text-left">Billed By</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                      {bills.map((b) => (
                                        <tr key={b.bill_id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-mono text-gray-900">#{b.bill_id}</td>
                                          <td className="px-3 py-2 text-gray-600">{new Date(b.date).toLocaleDateString()}</td>
                                          <td className="px-3 py-2 text-gray-800 font-medium">{b.billing_type}</td>
                                          <td className="px-3 py-2 font-semibold text-gray-900">₹{b.amount}</td>
                                          <td className="px-3 py-2 text-gray-600">{b.payment_mode}</td>
                                          <td className="px-3 py-2">
                                            <span
                                              className={`px-1.5 py-0.5 rounded font-medium ${
                                                b.status === 'Paid'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : 'bg-amber-100 text-amber-800'
                                              }`}
                                            >
                                              {b.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-gray-600">{b.handled_by_name || 'System'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Dispensed Medicines Table */}
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">Medicines Dispensed (From /pharmacy)</h3>
                              {dispensedMeds.length === 0 ? (
                                <p className="text-xs text-gray-500">No pharmacy medicines have been dispensed to this patient yet.</p>
                              ) : (
                                <div className="overflow-x-auto border border-gray-200 rounded-md">
                                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Tx ID</th>
                                        <th className="px-3 py-2 text-left">Date</th>
                                        <th className="px-3 py-2 text-left">Medicine</th>
                                        <th className="px-3 py-2 text-left">Batch</th>
                                        <th className="px-3 py-2 text-left">Quantity</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                      {dispensedMeds.map((m) => (
                                        <tr key={m.transaction_id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-mono text-gray-900">#{m.transaction_id}</td>
                                          <td className="px-3 py-2 text-gray-600">{new Date(m.date).toLocaleDateString()}</td>
                                          <td className="px-3 py-2 font-semibold text-gray-900">{m.medicine_name}</td>
                                          <td className="px-3 py-2 font-mono text-gray-600">{m.batch_number}</td>
                                          <td className="px-3 py-2 font-bold text-gray-900">{m.quantity}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* REGISTER NEW PATIENT MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Register New Patient</h3>
              <button
                onClick={() => setShowRegModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {regError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-2.5 mb-4 text-xs text-red-700">
                {regError}
              </div>
            )}

            {regSuccess && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-2.5 mb-4 text-xs text-emerald-700 font-semibold">
                {regSuccess}
              </div>
            )}

            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="130"
                    value={regForm.age}
                    onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                    placeholder="e.g. 35"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Sex *
                  </label>
                  <select
                    value={regForm.sex}
                    onChange={(e) => setRegForm({ ...regForm, sex: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={regForm.phone_number}
                    onChange={(e) => setRegForm({ ...regForm, phone_number: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="e.g. ramesh@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Description / General Complaints
                </label>
                <textarea
                  rows={2}
                  value={regForm.description}
                  onChange={(e) => setRegForm({ ...regForm, description: e.target.value })}
                  placeholder="e.g. Initial visit for recurring fever"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Past Medical History
                </label>
                <input
                  type="text"
                  value={regForm.past_medical_history}
                  onChange={(e) => setRegForm({ ...regForm, past_medical_history: e.target.value })}
                  placeholder="e.g. Hypertension (5 yrs), Diabetes Type 2"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Family History
                </label>
                <input
                  type="text"
                  value={regForm.family_history}
                  onChange={(e) => setRegForm({ ...regForm, family_history: e.target.value })}
                  placeholder="e.g. Maternal history of CAD"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                >
                  {regLoading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
