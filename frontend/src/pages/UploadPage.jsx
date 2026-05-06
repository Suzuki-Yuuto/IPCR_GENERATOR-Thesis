import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { API_URL } from '../constants';

const UploadPage = ({ user, uploadedFiles, isUploading, onFileUpload, selectedYear, selectedSemester, onManualSubmitSuccess }) => {
  const [isManualInput, setIsManualInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [regularFaculty, setRegularFaculty] = useState([]);
  
  const initialFormData = {
    accomplishment_category: 'Seminars, Conferences, and Training',
    title: '',
    date: '',
    venue: '',
    scope: 'Local',
    hours: '',
    sponsoredBy: '',
    researchRelated: 'No',
    target_presentation: '', target_publication: '', target_utilized: '',
    acc_presentation: '', acc_publication: '', acc_utilized: '',
    stat_proposal: '', stat_completed: '', stat_presented: '',
    stat_ip_rights: '', stat_utilized: '', stat_citations: '',
    admin_scopus: '', admin_rg: '', admin_gs: '',
    beneficiaries_count: '', beneficiaries_type: '',
    location: '', budget_allocation: '', evaluation: '', references: '',
    is_multiple_days: false, end_date: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [manualFile, setManualFile] = useState(null);

  const [extensionists, setExtensionists] = useState([
    { id: Date.now(), role: 'Project Head', members: [{ name: '', isRegularFaculty: false, userId: null }] }
  ]);

  const addRoleGroup = () => {
    setExtensionists([...extensionists, { id: Date.now(), role: '', members: [{ name: '', isRegularFaculty: false, userId: null }] }]);
  };

  const removeRoleGroup = (id) => {
    setExtensionists(extensionists.filter(g => g.id !== id));
  };

  const updateRoleName = (id, newRole) => {
    setExtensionists(extensionists.map(g => g.id === id ? { ...g, role: newRole } : g));
  };

  const addMember = (groupId) => {
    setExtensionists(extensionists.map(g => g.id === groupId ? { ...g, members: [...g.members, { name: '', isRegularFaculty: false, userId: null }] } : g));
  };

  const updateMember = (groupId, memberIndex, field, value) => {
    setExtensionists(extensionists.map(g => {
      if (g.id === groupId) {
        const newMembers = [...g.members];
        if (field === 'isRegularFaculty') {
          newMembers[memberIndex] = { ...newMembers[memberIndex], isRegularFaculty: value, name: '', userId: null };
        } else if (field === 'userId') {
          const faculty = regularFaculty.find(f => f.id.toString() === value.toString());
          newMembers[memberIndex] = { ...newMembers[memberIndex], userId: value, name: faculty ? faculty.name : '' };
        } else {
          newMembers[memberIndex] = { ...newMembers[memberIndex], [field]: value };
        }
        return { ...g, members: newMembers };
      }
      return g;
    }));
  };

  const removeMember = (groupId, memberIndex) => {
    setExtensionists(extensionists.map(g => {
      if (g.id === groupId) {
        return { ...g, members: g.members.filter((_, idx) => idx !== memberIndex) };
      }
      return g;
    }));
  };

  const fetchHistory = () => {
    if (user?.id) {
      setIsLoadingHistory(true);
      fetch(`${API_URL}/accomplishments/history/${user.id}?year=${selectedYear}&semester=${selectedSemester}`)
        .then(res => res.json())
        .then(data => setHistory(Array.isArray(data) ? data : []))
        .catch(err => console.error(err))
        .finally(() => setIsLoadingHistory(false));
    }
  };

  useEffect(() => {
    if (isManualInput) {
      fetchHistory();
      fetch(`${API_URL}/users/regular`)
        .then(res => res.json())
        .then(data => setRegularFaculty(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }
  }, [isManualInput, user, selectedYear, selectedSemester]);

  const handleFileChange = (e) => {
    onFileUpload(e, selectedYear, selectedSemester);
  };

  const handleManualFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setManualFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    const isSeminar = formData.accomplishment_category === 'Seminars, Conferences, and Training';
    const isListOfExtension = formData.accomplishment_category === 'List of Extension';

    if (isSeminar) {
      if (!user.tokens) {
        alert('Google Drive is not connected. Please connect your Google Drive to upload attachments.');
        return;
      }
      if (!manualFile) {
        alert("Please upload a PDF file.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        let val = formData[key];
        if (formData.accomplishment_category === 'Research') {
          if (key === 'title' && !val) val = 'Research Portfolio Data';
          if (key === 'date' && !val) val = new Date().toISOString().split('T')[0];
          if (key === 'venue' && !val) val = 'N/A';
          if (key === 'hours' && !val) val = '0';
          if (key === 'sponsoredBy' && !val) val = 'N/A';
        }
        
        if (isListOfExtension) {
          if (key === 'date') val = formData.is_multiple_days ? `${formData.date} - ${formData.end_date}` : formData.date;
          if (key === 'venue') val = formData.location;
        }

        if (typeof val !== 'boolean') submitData.append(key, val);
      });

      if (isListOfExtension) {
        submitData.append('beneficiaries', `${formData.beneficiaries_count} ${formData.beneficiaries_type}`);
        submitData.append('extension_personnel', JSON.stringify(extensionists));
        if (formData.references) {
           submitData.append('gdrive_link', formData.references);
        }
      }

      submitData.append('userId', user.id);
      submitData.append('academicYear', selectedYear);
      submitData.append('semester', selectedSemester);
      submitData.append('facultyName', user.name || 'Faculty');
      if (user.tokens) submitData.append('tokens', JSON.stringify(user.tokens));
      if (manualFile) submitData.append('file', manualFile);

      const res = await fetch(`${API_URL}/accomplishments/manual`, {
        method: 'POST',
        body: submitData
      });
      
      const data = await res.json();
      if (data.success) {
        alert('✅ Manual accomplishment saved successfully!');
        setFormData(initialFormData);
        setExtensionists([{ id: Date.now(), role: 'Project Head', members: [{ name: '', isRegularFaculty: false, userId: null }] }]);
        setManualFile(null);
        if (onManualSubmitSuccess) onManualSubmitSuccess();
        fetchHistory();
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Failed to submit form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 sm:px-10 bg-white rounded-3xl shadow-sm border border-gray-200/60 min-h-[calc(100vh-12rem)] space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">Upload Documents</h1>
          <p className="text-sm text-gray-500 mt-2">
            Add PDF files or manual inputs for <span className="font-medium text-gray-900">AY {selectedYear} · {selectedSemester}</span>
          </p>
        </div>
      </div>

      {user?.is_regular_faculty !== 0 && (
        <div className="flex justify-center -mt-6">
          <div className="bg-gray-100 p-1 rounded-xl inline-flex shadow-inner">
            <button 
              onClick={() => setIsManualInput(false)}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${!isManualInput ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Automatic Upload
            </button>
            <button 
              onClick={() => setIsManualInput(true)}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${isManualInput ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Manual Input
            </button>
          </div>
        </div>
      )}

      {(isManualInput && user?.is_regular_faculty !== 0) ? (
        <div className="space-y-8">
          <form onSubmit={handleManualSubmit} className="space-y-5 max-w-2xl mx-auto bg-gray-50 p-8 rounded-2xl border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-3">Faculty Accomplishment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Accomplishment Category *</label>
                <select required name="accomplishment_category" value={formData.accomplishment_category} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border bg-white">
                  <option value="Seminars, Conferences, and Training">Seminars, Conferences, and Training</option>
                  <option value="Research">Research</option>
                  <option value="Extension">Extension</option>
                  <option value="List of Extension">List of Extension</option>
                </select>
              </div>

              {(formData.accomplishment_category === 'Seminars, Conferences, and Training' || formData.accomplishment_category === 'Extension') && (
                <>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="Enter title..." />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input required type="date" max={new Date().toISOString().split('T')[0]} name="date" value={formData.date} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
                    <select required name="scope" value={formData.scope} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border bg-white">
                      <option value="Local">Local</option>
                      <option value="National">National</option>
                      <option value="Regional">Regional</option>
                      <option value="International">International</option>
                    </select>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conducted by / Venue *</label>
                    <input required type="text" name="venue" value={formData.venue} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="Enter venue..." />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
                    <input type="text" readOnly value={user.name} className="w-full rounded-lg border-gray-300 bg-gray-200 text-gray-600 shadow-sm sm:text-sm p-2.5 border cursor-not-allowed" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Hours *</label>
                    <input required type="number" min="1" name="hours" value={formData.hours} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="e.g. 8" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Research Related *</label>
                    <select required name="researchRelated" value={formData.researchRelated} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border bg-white">
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conducted/Sponsored by *</label>
                    <input required type="text" name="sponsoredBy" value={formData.sponsoredBy} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="Sponsor name..." />
                  </div>
                </>
              )}

              {formData.accomplishment_category === 'Research' && (
                <>
                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Research: Global Targets & Accomplishments</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Presentation</label>
                    <input type="number" name="target_presentation" value={formData.target_presentation} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acc. Presentation</label>
                    <input type="number" name="acc_presentation" value={formData.acc_presentation} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Publication</label>
                    <input type="number" name="target_publication" value={formData.target_publication} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acc. Publication</label>
                    <input type="number" name="acc_publication" value={formData.acc_publication} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Utilized</label>
                    <input type="number" name="target_utilized" value={formData.target_utilized} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acc. Utilized</label>
                    <input type="number" name="acc_utilized" value={formData.acc_utilized} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Research: Personal Statistics</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Submitted</label>
                    <input type="number" name="stat_proposal" value={formData.stat_proposal} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Completed Timeframe</label>
                    <input type="number" name="stat_completed" value={formData.stat_completed} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Presented</label>
                    <input type="number" name="stat_presented" value={formData.stat_presented} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Rights</label>
                    <input type="number" name="stat_ip_rights" value={formData.stat_ip_rights} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Utilized / Deployed</label>
                    <input type="number" name="stat_utilized" value={formData.stat_utilized} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Citations</label>
                    <input type="number" name="stat_citations" value={formData.stat_citations} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                  </div>

                  {user?.role === 'admin' && (
                    <>
                      <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
                        <h4 className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wider">Admin Only: Global Citations</h4>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scopus</label>
                        <input type="number" name="admin_scopus" value={formData.admin_scopus} onChange={handleInputChange} className="w-full rounded-lg border-blue-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ResearchGate (RG)</label>
                        <input type="number" name="admin_rg" value={formData.admin_rg} onChange={handleInputChange} className="w-full rounded-lg border-blue-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Scholar (GS)</label>
                        <input type="number" name="admin_gs" value={formData.admin_gs} onChange={handleInputChange} className="w-full rounded-lg border-blue-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="0" />
                      </div>
                    </>
                  )}
                </>
              )}

              {formData.accomplishment_category === 'List of Extension' && (
                <>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title of Projects *</label>
                    <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="Enter title..." />
                  </div>

                  <div className="col-span-1 md:col-span-2 flex items-center gap-2 mb-2">
                    <input type="checkbox" name="is_multiple_days" checked={formData.is_multiple_days} onChange={handleInputChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label className="text-sm font-medium text-gray-700">Multiple Days?</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{formData.is_multiple_days ? 'Start Date *' : 'Date *'}</label>
                    <input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                  </div>

                  {formData.is_multiple_days && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                      <input required type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiaries (Count) *</label>
                    <input required type="number" name="beneficiaries_count" value={formData.beneficiaries_count} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="e.g. 50" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiaries (Type/Name) *</label>
                    <input required type="text" name="beneficiaries_type" value={formData.beneficiaries_type} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="e.g. Students" />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <input required type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="Enter location..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocation</label>
                    <input type="text" name="budget_allocation" value={formData.budget_allocation} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="Optional..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">References (GDrive Link)</label>
                    <input type="text" name="references" value={formData.references} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="Optional link..." />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Score *</label>
                    <input required type="number" step="0.1" min="0" max="5" name="evaluation" value={formData.evaluation} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" placeholder="e.g. 4.5" />
                  </div>

                  {/* Extensionists UI */}
                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Extensionists *</h4>
                      <button type="button" onClick={addRoleGroup} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add Role Group
                      </button>
                    </div>

                    <div className="space-y-4">
                      {extensionists.map((group) => (
                        <div key={group.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                          <div className="flex justify-between gap-3 mb-3">
                            <input 
                              type="text" 
                              required
                              value={group.role} 
                              onChange={(e) => updateRoleName(group.id, e.target.value)} 
                              placeholder="Role Name (e.g. Project Head)" 
                              className="w-full font-medium text-gray-900 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" 
                            />
                            <button type="button" onClick={() => removeRoleGroup(group.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2 pl-2 border-l-2 border-blue-100 ml-1">
                            {group.members.map((member, mIdx) => (
                              <div key={mIdx} className="flex gap-2 items-center">
                                <div className="flex items-center gap-2 mr-2">
                                  <input
                                    type="checkbox"
                                    checked={member.isRegularFaculty}
                                    onChange={(e) => updateMember(group.id, mIdx, 'isRegularFaculty', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Is Regular Faculty?</label>
                                </div>
                                {member.isRegularFaculty ? (
                                  <select
                                    required
                                    value={member.userId || ''}
                                    onChange={(e) => updateMember(group.id, mIdx, 'userId', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5 border bg-white"
                                  >
                                    <option value="" disabled>Select Faculty</option>
                                    {regularFaculty.map(f => (
                                      <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input 
                                    type="text" 
                                    required
                                    value={member.name} 
                                    onChange={(e) => updateMember(group.id, mIdx, 'name', e.target.value)} 
                                    placeholder="Person's Name" 
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5 border" 
                                  />
                                )}
                                {group.members.length > 1 && (
                                  <button type="button" onClick={() => removeMember(group.id, mIdx)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={() => addMember(group.id)} className="text-xs font-medium text-gray-500 hover:text-gray-700 mt-2 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Add Member
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {formData.accomplishment_category === 'Seminars, Conferences, and Training' && (
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">PDF Certificate Attachment *</label>
                  <input required type="file" accept=".pdf" name="file" onChange={handleManualFileChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border bg-white" />
                </div>
              )}
            </div>
            
            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={isSubmitting} className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSubmitting ? 'Saving...' : 'Submit Accomplishment'}
              </button>
            </div>
          </form>

          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Your Manual Submissions
            </h3>
            {isLoadingHistory ? (
              <div className="text-center text-sm text-gray-500 py-4">Loading history...</div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <div className="flex gap-2 items-center text-xs text-gray-500 mt-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{item.accomplishment_category || 'General'}</span>
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {item.gdrive_link && (
                      <a href={item.gdrive_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline shrink-0">
                        View Reference
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-4 bg-gray-50 rounded-xl border border-gray-200">
                No manual submissions for this period.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="group relative border-2 border-gray-200 border-dashed hover:border-blue-300 bg-gray-50/50 hover:bg-blue-50/30 rounded-2xl p-12 text-center transition-all duration-300 shadow-inner">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4 group-hover:text-blue-500 transition-colors duration-300" strokeWidth={1.5} />
              <h3 className="text-base font-medium text-gray-900">Select IPCR PDF Files</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Files will be automatically categorized using AI
                {user.tokens && ' and uploaded to your connected Google Drive.'}
              </p>
              <div className="mt-8">
                <label className="inline-block relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <span className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer inline-flex items-center gap-2 ${
                    isUploading 
                      ? 'bg-gray-100 text-gray-400 pointer-events-none' 
                      : 'bg-gray-900 text-white hover:bg-black'
                  }`}>
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
                        Processing...
                      </>
                    ) : 'Browse Files'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 px-2 tracking-wide uppercase">
                Uploaded ({uploadedFiles.length})
              </h3>
              <div className="space-y-3">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="group flex items-center justify-between py-4 px-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                          <span className="text-gray-300 text-xs">•</span>
                          <span className="text-xs font-medium text-gray-700">{file.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pl-4">
                      {file.driveLink && (
                        <a
                          href={file.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors underline underline-offset-4"
                        >
                          View
                        </a>
                      )}
                      <CheckCircle className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadedFiles.length === 0 && !isUploading && (
            <div className="text-center text-gray-400 py-12 text-sm border-t border-gray-100">
              No documents uploaded for this period yet.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UploadPage;
