import React from 'react';
import { Home, Upload, User, Shield, BookOpen, Calendar } from 'lucide-react';
import { ACADEMIC_YEARS, SEMESTERS } from '../constants';

const NavBar = ({ currentPage, setCurrentPage, isAdmin, selectedYear, setSelectedYear, selectedSemester, setSelectedSemester }) => {
  const btnClass = (page) =>
    `flex items-center gap-2 px-1 py-3 transition whitespace-nowrap text-sm border-b-2 ${
      currentPage === page 
        ? 'border-gray-900 text-gray-900 font-semibold' 
        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300 font-medium'
    }`;

  return (
    <nav className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100">
      <div className="flex gap-6 w-full md:w-auto overflow-x-auto pb-0 scrollbar-hide">
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

      <div className="flex items-center gap-6 w-full md:w-auto pb-3">
        <div className="flex items-center gap-2 text-gray-600 focus-within:text-gray-900 transition-colors">
          <Calendar className="w-4 h-4 shrink-0" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer p-0 outline-none w-auto"
          >
            {ACADEMIC_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-gray-600 focus-within:text-gray-900 transition-colors">
          <BookOpen className="w-4 h-4 shrink-0" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer p-0 outline-none w-auto"
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
