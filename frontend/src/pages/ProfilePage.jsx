import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, User, Phone, Building, Briefcase, FileText, Loader2 } from 'lucide-react';
import { API_URL } from '../constants';

/**
 * ProfilePage
 *
 * Props:
 *   user – logged-in user object (must have .id)
 */
const ProfilePage = ({ user }) => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    contact_number: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'ok' | 'error'
  const [profileMeta, setProfileMeta] = useState({ email: '', profile_image: '', role: '' });

  // Load profile on mount
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/profile/${user.id}`)
      .then(r => r.json())
      .then(data => {
        setFormData({
          name: data.name || user.name || '',
          department: data.department || user.department || '',
          position: data.position || '',
          contact_number: data.contact_number || '',
          notes: data.notes || '',
        });
        setProfileMeta({
          email: data.email || user.email || '',
          profile_image: data.profile_image || user.profileImage || '',
          role: data.role || user.role || 'professor',
        });
      })
      .catch(() => {
        // Fallback to user object
        setFormData({
          name: user.name || '',
          department: user.department || '',
          position: '',
          contact_number: '',
          notes: '',
        });
        setProfileMeta({
          email: user.email || '',
          profile_image: user.profileImage || '',
          role: user.role || 'professor',
        });
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${API_URL}/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('ok');
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500">Loading profile…</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center gap-5">
            {profileMeta.profile_image ? (
              <img src={profileMeta.profile_image} alt={formData.name} className="w-20 h-20 rounded-full border-4 border-white/30" />
            ) : (
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white/30">
                {formData.name ? formData.name.split(' ').map(n => n[0]).join('') : 'U'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{formData.name || 'Your Profile'}</h2>
              <p className="text-blue-100 text-sm">{profileMeta.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-white/20 rounded-full text-xs text-white capitalize">
                {profileMeta.role}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">

          {/* Full Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 text-blue-500" />
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter your full name"
            />
          </div>

          {/* Department */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Building className="w-4 h-4 text-blue-500" />
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={e => handleChange('department', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter your department"
            />
          </div>

          {/* Position / Role */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Briefcase className="w-4 h-4 text-blue-500" />
              Position / Role
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={e => handleChange('position', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="e.g. Instructor III"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Phone className="w-4 h-4 text-blue-500" />
              Contact Number
            </label>
            <input
              type="text"
              value={formData.contact_number}
              onChange={e => handleChange('contact_number', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="e.g. 0917-123-4567"
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              Optional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              placeholder="Any additional information…"
            />
          </div>

          {/* Save button + status */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                         text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Profile'}
            </button>

            {saveStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" /> Profile saved successfully!
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" /> Failed to save. Please try again.
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 pt-1">
            Profile changes are saved locally and will not affect your Google account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
