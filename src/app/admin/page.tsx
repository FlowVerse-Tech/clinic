'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface UserAccount {
  user_id: number;
  username: string;
  role: string;
  name: string;
  active: boolean;
  created_at: string;
}

interface PatientSummary {
  patient_id: string;
  name: string;
  age: number;
  sex: string;
  phone_number: string;
  email: string | null;
  created_at: string;
}

interface BillSummary {
  bill_id: number;
  patient_id: string;
  patient_name?: string;
  billing_type: string;
  amount: string;
  payment_mode: string;
  status: string;
  date: string;
  handled_by_name?: string;
}

interface MedicineSummary {
  medicine_id: number;
  name: string;
  batch_number: string;
  expiry_date: string;
  current_stock: number;
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'patients' | 'bills' | 'stock'>('users');

  // Users state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Summary state (Patients, Bills, Medicines)
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [medicines, setMedicines] = useState<MedicineSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'Doctor',
    active: true,
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit User modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', active: true });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Reset Password modal
  const [resetUser, setResetUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(console.error);

    loadUsers();
    loadSummaries();
  }, []);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadSummaries = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/admin/summary');
      const data = await res.json();
      if (res.ok) {
        setPatients(data.patients || []);
        setBills(data.bills || []);
        setMedicines(data.medicines || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create user');
        setCreateLoading(false);
        return;
      }

      setShowCreateModal(false);
      setCreateForm({ username: '', password: '', name: '', role: 'Doctor', active: true });
      loadUsers();
    } catch (err: any) {
      setCreateError('Error creating user: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (user: UserAccount) => {
    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        loadUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError('');
    setEditLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${editingUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update user');
        setEditLoading(false);
        return;
      }

      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      setEditError('Error updating user: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;

    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${resetUser.user_id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Failed to reset password');
        setResetLoading(false);
        return;
      }

      setResetSuccess('Password updated successfully!');
      setTimeout(() => {
        setResetUser(null);
        setNewPassword('');
        setResetSuccess('');
      }, 1200);
    } catch (err: any) {
      setResetError('Error resetting password: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Doctor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Receptionist':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Pharmacy':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administrator Console</h1>
            <p className="text-sm text-gray-600">
              Manage user accounts, roles, access credentials, and review clinical summaries.
            </p>
          </div>

          <div className="flex bg-white rounded-md border border-gray-300 p-0.5">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'patients'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Patients ({patients.length})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'bills'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Bills ({bills.length})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'stock'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Stock ({medicines.length})
            </button>
          </div>
        </div>

        {/* TAB 1: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">User Accounts</h2>
                <p className="text-xs text-gray-500">
                  Doctor, Receptionist, Pharmacy, and Admin access credentials.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
              >
                + Create User Account
              </button>
            </div>

            {usersLoading ? (
              <div className="text-center py-12 text-sm text-gray-500">Loading user accounts...</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">User ID</th>
                      <th className="px-4 py-3 text-left">Username</th>
                      <th className="px-4 py-3 text-left">Full Name</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {users.map((u) => (
                      <tr key={u.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-900">#{u.user_id}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{u.username}</td>
                        <td className="px-4 py-3 text-gray-700">{u.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadge(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              u.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditForm({ name: u.name, role: u.role, active: u.active });
                            }}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => {
                              setResetUser(u);
                              setNewPassword('');
                              setResetError('');
                              setResetSuccess('');
                            }}
                            className="text-xs text-amber-600 hover:underline font-medium"
                          >
                            Reset Password
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`text-xs font-medium hover:underline ${
                              u.active ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PATIENTS DIRECTORY (READ-ONLY) */}
        {activeTab === 'patients' && (
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-gray-900">Patients Directory (Read-Only)</h2>
              <p className="text-xs text-gray-500">Global listing of all registered clinic patients.</p>
            </div>

            {summaryLoading ? (
              <div className="text-center py-12 text-sm text-gray-500">Loading patients...</div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">No patients registered yet.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Patient ID</th>
                      <th className="px-4 py-3 text-left">Full Name</th>
                      <th className="px-4 py-3 text-left">Age / Sex</th>
                      <th className="px-4 py-3 text-left">Phone Number</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {patients.map((p) => (
                      <tr key={p.patient_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{p.patient_id}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 text-gray-700">{p.age} yrs, {p.sex}</td>
                        <td className="px-4 py-3 text-gray-700">{p.phone_number}</td>
                        <td className="px-4 py-3 text-gray-500">{p.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BILLS SUMMARY (READ-ONLY) */}
        {activeTab === 'bills' && (
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-gray-900">All Clinic Bills (Read-Only)</h2>
              <p className="text-xs text-gray-500">Consolidated history of consultation and pharmacy invoices.</p>
            </div>

            {summaryLoading ? (
              <div className="text-center py-12 text-sm text-gray-500">Loading bills...</div>
            ) : bills.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">No bills recorded yet.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Bill ID</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Patient</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Payment Mode</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Processed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {bills.map((b) => (
                      <tr key={b.bill_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-900 font-semibold">#{b.bill_id}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(b.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{b.patient_name || '—'}</div>
                          <div className="font-mono text-xs text-gray-400">{b.patient_id}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{b.billing_type}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">₹{b.amount}</td>
                        <td className="px-4 py-3 text-gray-600">{b.payment_mode}</td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-gray-600">{b.handled_by_name || 'Staff'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STOCK MASTER (READ-ONLY) */}
        {activeTab === 'stock' && (
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-gray-900">Medicine Stock Master (Read-Only)</h2>
              <p className="text-xs text-gray-500">Comprehensive inventory status sorted by stock levels.</p>
            </div>

            {summaryLoading ? (
              <div className="text-center py-12 text-sm text-gray-500">Loading stock inventory...</div>
            ) : medicines.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">No stock in inventory.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Medicine Name</th>
                      <th className="px-4 py-3 text-left">Batch Number</th>
                      <th className="px-4 py-3 text-left">Expiry Date</th>
                      <th className="px-4 py-3 text-left">Current Stock</th>
                      <th className="px-4 py-3 text-left">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {medicines.map((m) => {
                      const isLow = m.current_stock <= 10;
                      return (
                        <tr key={m.medicine_id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50/50' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900">{m.name}</td>
                          <td className="px-4 py-3 font-mono text-gray-600">{m.batch_number}</td>
                          <td className="px-4 py-3 text-gray-700">{new Date(m.expiry_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{m.current_stock}</td>
                          <td className="px-4 py-3">
                            {isLow ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                                Low Stock (&le; 10)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs text-emerald-800 bg-emerald-100 font-medium">
                                OK
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
      </main>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Create New Staff Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {createError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-2.5 mb-3 text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dr_sharma or rec_priya"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Sharma"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">Role *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 bg-white focus:outline-none"
                >
                  <option value="Doctor">Doctor (access to /doctor)</option>
                  <option value="Receptionist">Receptionist (access to /bills)</option>
                  <option value="Pharmacy">Pharmacy Staff (access to /pharmacy)</option>
                  <option value="Admin">Admin (access to /admin and all)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create-active"
                  checked={createForm.active}
                  onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="create-active" className="text-gray-700 font-medium">Account Active</label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Edit User ({editingUser.username})</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {editError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-2.5 mb-3 text-xs text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 bg-white focus:outline-none"
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="edit-active" className="text-gray-700 font-medium">Account Active</label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                Reset Password: {resetUser.name} ({resetUser.username})
              </h3>
              <button onClick={() => setResetUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {resetError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-2.5 mb-3 text-xs text-red-700">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-2.5 mb-3 text-xs text-emerald-700 font-semibold">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 4 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {resetLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
