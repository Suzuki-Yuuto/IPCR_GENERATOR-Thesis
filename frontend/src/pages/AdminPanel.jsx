import React, { useState, useEffect } from 'react';
import {
  Search, Save, Calendar, BookOpen, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, FileText, User, Phone,
  Building, Briefcase, FolderOpen, Loader2, X
} from 'lucide-react';
import { API_URL, ACADEMIC_YEARS, SEMESTERS } from '../constants';

/**
 * AdminPanel
 *
 * Props:
 *   adminData       – array of faculty objects from the API
 *   selectedYear    – currently active academic year (string)
 *   selectedSemester– currently active semester (string)
 *   onConfigSaved   – callback(year, semester) after saving config
 */
const AdminPanel = ({ adminData, selectedYear, selectedSemester, onConfigSaved }) => {
  // ── Semester Config state ──────────────────────────────────────────────────
  const [configYear,      setConfigYear]      = useState(selectedYear      || ACADEMIC_YEARS[2]);
  const [configSemester,  setConfigSemester]  = useState(selectedSemester  || SEMESTERS[0]);
  const [configStartDate, setConfigStartDate] = useState('');
  const [configEndDate,   setConfigEndDate]   = useState('');
  const [saveStatus,      setSaveStatus]      = useState(null); // 'saving' | 'ok' | 'error'

  // ── Faculty Overview state ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');

  // ── Faculty Detail state ───────────────────────────────────────────────────
  const [expandedUserId,  setExpandedUserId]  = useState(null);
  const [facultyDetail,   setFacultyDetail]   = useState(null);
  const [detailLoading,   setDetailLoading]   = useState(false);

  // Load existing config on mount
  useEffect(() => {
    fetch(`${API_URL}/semester-config`)
      .then(r => r.json())
      .then(data => {
        if (data.academic_year) setConfigYear(data.academic_year);
        if (data.semester)      setConfigSemester(data.semester);
        if (data.start_date)    setConfigStartDate(data.start_date);
        if (data.end_date)      setConfigEndDate(data.end_date);
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_URL}/semester-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academic_year: configYear,
          semester:      configSemester,
          start_date:    configStartDate || null,
          end_date:      configEndDate   || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('ok');
        if (onConfigSaved) onConfigSaved(configYear, configSemester);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  // ── Faculty Detail fetch ──────────────────────────────────────────────────
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

  // ── Faculty filter ────────────────────────────────────────────────────────
  const filteredData = adminData.filter(faculty =>
    (faculty.name       || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (faculty.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryColors = {
    'Syllabus':       'bg-purple-100 text-purple-700',
    'Course Guide':   'bg-blue-100   text-blue-700',
    'SLM':            'bg-green-100  text-green-700',
    'Grading Sheet':  'bg-orange-100 text-orange-700',
    'TOS':            'bg-pink-100   text-pink-700',
  };

  const folderLinkLabels = {
    syllabus:     { label: 'Syllabus',       icon: '📘' },
    courseGuide:   { label: 'Course Guide',   icon: '📗' },
    slm:           { label: 'SLM',            icon: '📙' },
    gradingSheet:  { label: 'Grading Sheet',  icon: '📊' },
    tos:           { label: 'TOS',            icon: '📋' },
  };

  return (
    <div className="space-y-8">

      {/* ── Semester Configuration Card ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Semester Configuration</h2>
          </div>
          <p className="text-blue-100 text-sm mt-1">Set the active academic period for the IPCR system.</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <BookOpen className="inline w-4 h-4 mr-1 text-blue-500" />
                Academic Year
              </label>
              <select
                value={configYear}
                onChange={e => setConfigYear(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           bg-white transition"
              >
                {ACADEMIC_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <BookOpen className="inline w-4 h-4 mr-1 text-blue-500" />
                Semester
              </label>
              <select
                value={configSemester}
                onChange={e => setConfigSemester(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           bg-white transition"
              >
                {SEMESTERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="inline w-4 h-4 mr-1 text-green-500" />
                Start of Semester
              </label>
              <input
                type="date"
                value={configStartDate}
                onChange={e => setConfigStartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           bg-white transition"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="inline w-4 h-4 mr-1 text-red-500" />
                End of Semester
              </label>
              <input
                type="date"
                value={configEndDate}
                onChange={e => setConfigEndDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           bg-white transition"
              />
            </div>
          </div>

          {/* Save button + status */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSaveConfig}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                         text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              <Save className="w-4 h-4" />
              {saveStatus === 'saving' ? 'Saving…' : 'Save Configuration'}
            </button>

            {saveStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" /> Configuration saved!
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" /> Failed to save. Try again.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Faculty Overview Card ────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Faculty Overview</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              AY {selectedYear} · {selectedSemester}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search faculty…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Faculty Name</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Documents</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Avg Rating</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.length > 0 ? (
                  filteredData.map((faculty, index) => (
                    <React.Fragment key={faculty.id || index}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleFacultyDetail(faculty.id)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                              {faculty.name ? faculty.name.split(' ').map(n => n[0]).join('') : 'U'}
                            </div>
                            <span className="font-medium text-gray-800">{faculty.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{faculty.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-700 font-medium">{faculty.document_count || 0}</td>
                        <td className="px-6 py-4">
                          {faculty.avg_rating != null
                            ? <span className="font-semibold text-blue-700">{Number(faculty.avg_rating).toFixed(2)}</span>
                            : <span className="text-gray-400">—</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            className="text-blue-600 hover:text-blue-800 transition p-1"
                            title={expandedUserId === faculty.id ? 'Hide Details' : 'View Details'}
                          >
                            {expandedUserId === faculty.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>

                      {/* ── Expanded Detail Row ─────────────────────────── */}
                      {expandedUserId === faculty.id && (
                        <tr>
                          <td colSpan="6" className="p-0">
                            <div className="bg-gray-50 border-t border-b border-gray-200 p-6">
                              {detailLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                  <span className="ml-3 text-gray-500">Loading faculty details…</span>
                                </div>
                              ) : facultyDetail ? (
                                <div className="space-y-6">

                                  {/* Profile Info */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                      <User className="w-4 h-4" /> Profile Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-0.5">Name</p>
                                        <p className="font-medium text-gray-800">{facultyDetail.profile?.name || 'N/A'}</p>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-0.5">Department</p>
                                        <p className="font-medium text-gray-800">{facultyDetail.profile?.department || 'N/A'}</p>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-0.5">Position</p>
                                        <p className="font-medium text-gray-800">{facultyDetail.profile?.position || 'N/A'}</p>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-0.5">Contact</p>
                                        <p className="font-medium text-gray-800">{facultyDetail.profile?.contact_number || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Google Drive Folders */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                      <FolderOpen className="w-4 h-4" /> Google Drive Folders
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(folderLinkLabels).map(([key, { label, icon }]) => {
                                        const link = facultyDetail.folderLinks?.[key];
                                        return (
                                          <a
                                            key={key}
                                            href={link || '#'}
                                            target={link ? '_blank' : undefined}
                                            rel="noopener noreferrer"
                                            onClick={e => { if (!link) e.preventDefault(); }}
                                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${
                                              link
                                                ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                          >
                                            <span>{icon}</span>
                                            {label}
                                            {link && <ExternalLink className="w-3.5 h-3.5" />}
                                          </a>
                                        );
                                      })}
                                    </div>
                                    {!Object.values(facultyDetail.folderLinks || {}).some(Boolean) && (
                                      <p className="text-xs text-gray-400 mt-2">No folder links available for this period.</p>
                                    )}
                                  </div>

                                  {/* Documents */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                      <FileText className="w-4 h-4" /> Uploaded Documents
                                      <span className="text-xs font-normal text-gray-400 ml-1">
                                        {selectedYear} · {selectedSemester}
                                      </span>
                                    </h4>
                                    {(facultyDetail.documents || []).length > 0 ? (
                                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                          <thead className="bg-gray-50 border-b">
                                            <tr>
                                              <th className="px-4 py-2 text-xs text-gray-500 font-medium">Filename</th>
                                              <th className="px-4 py-2 text-xs text-gray-500 font-medium">Category</th>
                                              <th className="px-4 py-2 text-xs text-gray-500 font-medium">Size</th>
                                              <th className="px-4 py-2 text-xs text-gray-500 font-medium">Uploaded</th>
                                              <th className="px-4 py-2 text-xs text-gray-500 font-medium">Link</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {facultyDetail.documents.map(doc => (
                                              <tr key={doc.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-800 truncate max-w-[200px]">{doc.name}</td>
                                                <td className="px-4 py-2">
                                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[doc.category] || 'bg-gray-100 text-gray-700'}`}>
                                                    {doc.category}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2 text-gray-500">{doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : '—'}</td>
                                                <td className="px-4 py-2 text-gray-500">{doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-2">
                                                  {doc.driveLink ? (
                                                    <a href={doc.driveLink} target="_blank" rel="noopener noreferrer"
                                                       className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs font-medium">
                                                      Open <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                  ) : <span className="text-gray-400 text-xs">—</span>}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400">No documents uploaded for this period.</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 text-center py-4">Failed to load faculty details.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      {adminData.length === 0 ? 'No faculty data available' : 'No results match your search'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
