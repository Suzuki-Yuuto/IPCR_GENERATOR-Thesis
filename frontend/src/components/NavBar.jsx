import React from 'react';
import { Home, Upload, User, Shield, BookOpen, Calendar, Target } from 'lucide-react';
import { ACADEMIC_YEARS, SEMESTERS } from '../constants';

const NavBar = ({ currentPage, setCurrentPage, isAdmin, selectedYear, setSelectedYear, selectedSemester, setSelectedSemester }) => {
  const btnClass = (page) =>
    `flex items-center gap-2 px-4 py-2.5 transition-all whitespace-nowrap text-sm rounded-xl ${
      currentPage === page 
        ? 'bg-gray-900 text-white font-semibold shadow-md' 
        : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-medium'
    }`;

  return (
    <nav className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 sm:px-4 sm:py-3 rounded-2xl shadow-sm border border-gray-200/60">
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
        {!isAdmin && (
          <button onClick={() => setCurrentPage('targets')} className={btnClass('targets')}>
            <Target className="w-4 h-4" />
            Targets
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setCurrentPage('admin')} className={btnClass('admin')}>
            <Shield className="w-4 h-4" />
            Admin Panel
          </button>
        )}
      </div>

      <div className="flex items-center gap-6 w-full md:w-auto px-2">
        <div className="flex items-center gap-2 text-gray-600 focus-within:text-gray-900 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <Calendar className="w-4 h-4 shrink-0" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer p-0 outline-none w-auto pr-4"
          >
            {ACADEMIC_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-gray-600 focus-within:text-gray-900 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <BookOpen className="w-4 h-4 shrink-0" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer p-0 outline-none w-auto pr-4"
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
