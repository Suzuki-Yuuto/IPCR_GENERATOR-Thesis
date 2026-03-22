import React from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';

const UploadPage = ({ user, uploadedFiles, isUploading, onFileUpload, selectedYear, selectedSemester }) => {
  const handleFileChange = (e) => {
    onFileUpload(e, selectedYear, selectedSemester);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 sm:px-10 bg-white rounded-3xl shadow-sm border border-gray-200/60 min-h-[calc(100vh-12rem)] space-y-12">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">Upload Documents</h1>
          <p className="text-sm text-gray-500 mt-2">
            Add PDF files for <span className="font-medium text-gray-900">AY {selectedYear} · {selectedSemester}</span>
          </p>
        </div>
      </div>

      {/* ── Upload Dropzone ─────────────────────────────────────────────────── */}
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
    </div>
  );
};

export default UploadPage;
