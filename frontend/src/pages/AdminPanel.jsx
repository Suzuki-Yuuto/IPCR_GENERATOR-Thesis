import React, { useState, useEffect } from 'react';
import { Search, Save, Calendar, BookOpen, CheckCircle, AlertCircle, ChevronDown, ChevronUp, ExternalLink, FileText, User, FolderOpen, Loader2, Download } from 'lucide-react';
import { API_URL } from '../constants';

const AdminPanel = ({ currentUser, adminData, selectedYear, selectedSemester, onConfigSaved, availableYears = [], availableSemesters = [] }) => {
  const [configSemester, setConfigSemester] = useState(selectedSemester || availableSemesters[0] || '');
  const [configStartDate, setConfigStartDate] = useState('');
  const [configEndDate, setConfigEndDate] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [facultyDetail, setFacultyDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/semester-config`)
      .then(r => r.json())
      .then(data => {
        if (data.semester) setConfigSemester(data.semester);
        if (data.start_date) setConfigStartDate(data.start_date);
        if (data.end_date) setConfigEndDate(data.end_date);
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    try {
      if (!configStartDate || !configEndDate) {
        setSaveStatus('error');
        return;
      }

      const res = await fetch(`${API_URL}/semester-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: configSemester,
          start_date: configStartDate,
          end_date: configEndDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('ok');
        if (onConfigSaved) onConfigSaved(data.academic_year, configSemester);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  const toggleFacultyDetail = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setFacultyDetail(null);
      return;
    }
    setExpandedUserId(userId);
    setDetailLoading(true);
    setFacultyDetail(null);
    try {
      const params = new URLSearchParams({ year: selectedYear, semester: selectedSemester });
      const res = await fetch(`${API_URL}/admin/faculty/${userId}?${params}`);
      const data = await res.json();
      setFacultyDetail(data);
    } catch (err) {
      console.error('Error fetching faculty detail:', err);
      setFacultyDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredData = adminData.filter(faculty =>
    (faculty.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (faculty.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportAccomplishments = async () => {
    try {
      const params = new URLSearchParams({ 
        year: selectedYear, 
        semester: selectedSemester,
        requesterId: currentUser?.id 
      });
      const res = await fetch(`${API_URL}/accomplishments/export-all?${params}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Admin access required');
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `All_Faculty_Accomplishments_${selectedYear}_${selectedSemester}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('✅ All Faculty Accomplishments exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed: ' + error.message);
    }
  };

  const folderLinkLabels = {
    syllabus: { label: 'Syllabus', icon: '📄' },
    courseGuide: { label: 'Course Guide', icon: '📄' },
    slm: { label: 'SLM', icon: '📄' },
    gradingSheet: { label: 'Grading Sheet', icon: '📄' },
    tos: { label: 'TOS', icon: '📄' },
  };

  return (
    <div className="space-y-16 py-6 max-w-6xl mx-auto">
      
      {/* ── Semester Configuration ────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-gray-100 mb-8">
          <div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">Admin System</h1>
            <p className="text-sm text-gray-500 mt-2">Manage academic periods and view faculty data.</p>
          </div>
          <div>
            <button
              onClick={handleExportAccomplishments}
              className="group flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all"
            >
              <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              Export All Accomplishments
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-200/60 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 tracking-wide uppercase mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" /> System Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semester</label>
              <select
                value={configSemester}
                onChange={e => setConfigSemester(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {availableSemesters.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Start Date</label>
              <input
                type="date"
                value={configStartDate}
                onChange={e => setConfigStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">End Date</label>
              <input
                type="date"
                value={configEndDate}
                onChange={e => setConfigEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleSaveConfig}
              disabled={saveStatus === 'saving'}
              className="px-6 py-3 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saveStatus === 'saving' ? 'Saving...' : 'Apply Limits'}
            </button>
            {saveStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                <CheckCircle className="w-4 h-4" /> Success
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                <AlertCircle className="w-4 h-4" /> Failed
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Faculty Overview ────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
          <h2 className="text-xl font-medium text-gray-900">Faculty Records</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="py-4 px-2 text-xs font-semibold text-gray-900 uppercase tracking-widest">Faculty Member</th>
                <th className="py-4 px-2 text-xs font-semibold text-gray-900 uppercase tracking-widest hidden md:table-cell">Department</th>
                <th className="py-4 px-2 text-xs font-semibold text-gray-900 uppercase tracking-widest text-right">Docs</th>
                <th className="py-4 px-2 text-xs font-semibold text-gray-900 uppercase tracking-widest text-right">Rating</th>
                <th className="py-4 px-2 text-xs font-semibold text-gray-900 uppercase tracking-widest text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((faculty, index) => (
                  <React.Fragment key={faculty.id || index}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer group transition-colors"
                      onClick={() => toggleFacultyDetail(faculty.id)}
                    >
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 shrink-0">
                            {faculty.name ? faculty.name.split(' ').map(n => n[0]).join('') : 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{faculty.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 md:hidden">{faculty.department || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-sm text-gray-500 hidden md:table-cell">{faculty.department || '—'}</td>
                      <td className="py-4 px-2 text-sm text-gray-500 text-right">{faculty.document_count || 0}</td>
                      <td className="py-4 px-2 text-right">
                        {faculty.avg_rating != null
                          ? <span className="font-semibold text-gray-900">{Number(faculty.avg_rating).toFixed(2)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-4 px-2 text-center text-gray-300 group-hover:text-gray-900 transition-colors">
                        {expandedUserId === faculty.id ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                      </td>
                    </tr>

                    {/* Extended Details */}
                    {expandedUserId === faculty.id && (
                      <tr className="bg-gray-50/80 shadow-inner">
                        <td colSpan="5" className="px-6 py-10 border-b border-gray-200">
                          {detailLoading ? (
                            <div className="flex items-center justify-center text-sm text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading records...
                            </div>
                          ) : facultyDetail ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                              
                              {/* Drive Folders Column */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <FolderOpen className="w-3.5 h-3.5" /> Drive Repositories
                                </h4>
                                <div className="space-y-2">
                                  {Object.entries(folderLinkLabels).map(([key, { label }]) => {
                                    const link = facultyDetail.folderLinks?.[key];
                                    return link ? (
                                      <a
                                        key={key}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:border-gray-400 transition-colors group"
                                      >
                                        <span className="text-sm font-medium text-gray-700">{label}</span>
                                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600" />
                                      </a>
                                    ) : null;
                                  })}
                                  {!Object.values(facultyDetail.folderLinks || {}).some(Boolean) && (
                                    <p className="text-sm text-gray-400 italic">No remote folders established.</p>
                                  )}
                                </div>
                              </div>

                              {/* Documents Table Column */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5" /> Recent Uploads
                                </h4>
                                {(facultyDetail.documents || []).length > 0 ? (
                                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
                                    <table className="w-full text-left text-sm">
                                      <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                          <th className="px-3 py-2 text-xs font-medium text-gray-500">Document</th>
                                          <th className="px-3 py-2 text-xs font-medium text-gray-500">Tag</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {facultyDetail.documents.map(doc => (
                                          <tr key={doc.id}>
                                            <td className="px-3 py-2 text-gray-800 truncate max-w-[150px]" title={doc.name}>{doc.name}</td>
                                            <td className="px-3 py-2 text-xs text-gray-500">{doc.category}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400 italic mb-6">No files submitted.</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-red-500 text-center">Failed to load payload.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-sm text-gray-500">
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
