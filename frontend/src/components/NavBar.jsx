import React from 'react';
import { Home, Upload, User, Shield, BookOpen, Calendar } from 'lucide-react';
import { ACADEMIC_YEARS, SEMESTERS } from '../constants';

const NavBar = ({ currentPage, setCurrentPage, isAdmin, selectedYear, setSelectedYear, selectedSemester, setSelectedSemester }) => {
  const btnClass = (page) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap font-medium text-sm ${
      currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <nav className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-2 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        <button onClick={() => setCurrentPage('dashboard')} className={btnClass('dashboard')}>
          <Home className="w-4 h-4" />
          Dashboard
        </button>
        <button onClick={() => setCurrentPage('upload')} className={btnClass('upload')}>
          <Upload className="w-4 h-4" />
          Upload Documents
        </button>
        <button onClick={() => setCurrentPage('profile')} className={btnClass('profile')}>
          <User className="w-4 h-4" />
          Profile
        </button>
        {isAdmin && (
          <button onClick={() => setCurrentPage('admin')} className={btnClass('admin')}>
            <Shield className="w-4 h-4" />
            Admin Panel
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full md:w-auto focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent border-none text-gray-700 text-sm font-medium focus:ring-0 cursor-pointer w-full md:w-auto outline-none"
          >
            {ACADEMIC_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full md:w-auto focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <BookOpen className="w-4 h-4 text-gray-500 shrink-0" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-transparent border-none text-gray-700 text-sm font-medium focus:ring-0 cursor-pointer w-full md:w-auto outline-none"
          >
            {SEMESTERS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
