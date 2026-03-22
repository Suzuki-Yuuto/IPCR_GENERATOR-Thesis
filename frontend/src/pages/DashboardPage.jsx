import React, { useState } from 'react';
import { CheckCircle, Clock, Download, HardDrive, SlidersHorizontal } from 'lucide-react';
import { CATEGORY_NAMES, CATEGORY_GROUPS, GROUP_NAMES } from '../constants';

const DashboardPage = ({ user, ipcrData, onExport, selectedYear, selectedSemester }) => {
  const [viewMode, setViewMode] = useState('category'); // 'category', 'alpha', 'asc', 'desc'

  const calculateRating = (target, accomplished) => {
    if (target === 0) return 0;
    const ratio = accomplished / target;
    if (ratio >= 1.0) return 5;
    if (ratio >= 0.8) return 4;
    if (ratio >= 0.6) return 3;
    if (ratio >= 0.4) return 2;
    return 1;
  };

  const calculateOverallRating = () => {
    const categories = Object.values(ipcrData);
    const validCategories = categories.filter(cat => cat.target > 0);
    if (validCategories.length === 0) return 0;

    const totalRating = validCategories.reduce((sum, cat) => {
      const r = cat.rating != null && cat.rating > 0
        ? Number(cat.rating)
        : calculateRating(cat.target, cat.accomplished);
      return sum + r;
    }, 0);

    return (totalRating / validCategories.length).toFixed(2);
  };

  const items = Object.entries(ipcrData).map(([key, data]) => ({
    key,
    name: CATEGORY_NAMES[key] || key,
    data,
    rating: data.rating != null && data.rating > 0
      ? Number(data.rating)
      : calculateRating(data.target, data.accomplished)
  }));

  function renderCard(item) {
    const { key, name, data, rating } = item;
    return (
      <div key={key} className="group">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {name}
          </h3>
          <span className="text-sm font-semibold text-gray-700">
            {rating.toFixed(1)}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {data.accomplished} <span className="text-gray-300 mx-1">/</span> {data.target} target
            </span>
            {data.submitted && (
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {data.submitted}
              </span>
            )}
          </div>

          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                rating >= 4 ? 'bg-gray-800' :
                rating >= 3 ? 'bg-gray-500' :
                'bg-gray-300'
              }`}
              style={{ width: `${Math.min((data.accomplished / (data.target || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  let displayContent;
  if (viewMode === 'category') {
    displayContent = Object.entries(CATEGORY_GROUPS).map(([groupKey, itemKeys]) => {
      const groupItems = items.filter(i => itemKeys.includes(i.key));
      if (groupItems.length === 0) return null;
      return (
        <div key={groupKey} className="mb-12">
          <h2 className="text-xl font-medium text-gray-900 mb-6 border-b border-gray-100 pb-2">
            {GROUP_NAMES[groupKey]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            {groupItems.map(renderCard)}
          </div>
        </div>
      );
    });
  } else {
    let sortedItems = [...items];
    if (viewMode === 'alpha') {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    } else if (viewMode === 'desc') {
      sortedItems.sort((a, b) => b.data.accomplished - a.data.accomplished);
    } else if (viewMode === 'asc') {
      sortedItems.sort((a, b) => a.data.accomplished - b.data.accomplished);
    }
    displayContent = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
        {sortedItems.map(renderCard)}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            {selectedYear && selectedSemester && (
              <span>AY {selectedYear} · {selectedSemester}</span>
            )}
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              {user.tokens ? (
                <><CheckCircle className="w-4 h-4 text-green-500" /> Drive Connected</>
              ) : (
                <><HardDrive className="w-4 h-4 text-gray-400" /> Local Storage</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Overall Rating</p>
            <p className="text-3xl font-semibold text-gray-800 leading-none">
              {calculateOverallRating()} <span className="text-lg text-gray-400 font-normal">/ 5.0</span>
            </p>
          </div>
          <button
            onClick={onExport}
            className="group flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-all"
          >
            <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            Export
          </button>
        </div>
      </div>

      {/* Toolbar / Options */}
      <div className="flex justify-end mt-[-10px] mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <span className="font-medium mr-1">View by:</span>
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="bg-transparent font-medium text-gray-900 border-none outline-none focus:ring-0 cursor-pointer p-0"
          >
            <option value="category">Category Groups</option>
            <option value="alpha">Alphabetical (A-Z)</option>
            <option value="desc">Accomplished (Highest First)</option>
            <option value="asc">Accomplished (Lowest First)</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div>
        {displayContent}
      </div>
    </div>
  );
};

export default DashboardPage;
