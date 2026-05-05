import React, { useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { API_URL } from '../constants';

const UploadPage = ({ user, uploadedFiles, isUploading, onFileUpload, selectedYear, selectedSemester, onManualSubmitSuccess }) => {
  const [isManualInput, setIsManualInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    venue: '',
    scope: 'Local',
    hours: '',
    sponsoredBy: '',
    researchRelated: 'No'
  });
  const [manualFile, setManualFile] = useState(null);

  const handleFileChange = (e) => {
    onFileUpload(e, selectedYear, selectedSemester);
  };

  const handleManualFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setManualFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!user.tokens) {
      alert('Google Drive is not connected. Please connect your Google Drive to upload attachments.');
      return;
    }
    if (!manualFile) {
      alert("Please upload a PDF file.");
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      submitData.append('userId', user.id);
      submitData.append('academicYear', selectedYear);
      submitData.append('semester', selectedSemester);
      submitData.append('facultyName', user.name || 'Faculty');
      if (user.tokens) {
        submitData.append('tokens', JSON.stringify(user.tokens));
      }
      submitData.append('file', manualFile);

      const res = await fetch(`${API_URL}/accomplishments/manual`, {
        method: 'POST',
        body: submitData
      });
      
      const data = await res.json();
      if (data.success) {
        alert('✅ Manual accomplishment saved successfully!');
        setFormData({
          title: '', date: '', venue: '', scope: 'Local', hours: '', sponsoredBy: '', researchRelated: 'No'
        });
        setManualFile(null);
        if (onManualSubmitSuccess) onManualSubmitSuccess();
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
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">Upload Documents</h1>
          <p className="text-sm text-gray-500 mt-2">
            Add PDF files or manual inputs for <span className="font-medium text-gray-900">AY {selectedYear} · {selectedSemester}</span>
          </p>
        </div>
      </div>

      {/* ── Toggle ─────────────────────────────────────────────────────────── */}
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

      {isManualInput ? (
        /* ── Manual Input Form ───────────────────────────────────────────────── */
        <form onSubmit={handleManualSubmit} className="space-y-5 max-w-2xl mx-auto bg-gray-50 p-8 rounded-2xl border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-3">Faculty Accomplishment Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title Training/Seminar/Conference *</label>
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

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">PDF Certificate Attachment *</label>
              <input required type="file" accept=".pdf" name="file" onChange={handleManualFileChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border bg-white" />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isSubmitting} className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isSubmitting ? 'Saving...' : 'Submit Accomplishment'}
            </button>
          </div>
        </form>
      ) : (
        /* ── Upload Dropzone ─────────────────────────────────────────────────── */
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

          {/* ── File list ─────────────────────────────────────────────────────── */}
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
