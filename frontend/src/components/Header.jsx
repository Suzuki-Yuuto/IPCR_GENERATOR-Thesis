import React, { useState } from 'react';
import { FileText, LogOut, AlertTriangle, User } from 'lucide-react';

const Header = ({ user, onLogout }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <>
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center gap-3">
              <div className="p-2">
                <FileText className="w-7 h-7 text-gray-900" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight leading-tight">IPCR System</h1>
                <p className="text-xs text-gray-500 tracking-wide uppercase mt-0.5">Laguna State Polytechnic Univ.</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize tracking-wide mt-0.5">
                  {user.role === 'admin' ? 'Administrator' : 'Faculty'}
                </p>
              </div>
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 border border-gray-200">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="text-gray-400 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                title="Logout"
              >
                Log Out
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 transform transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <AlertTriangle className="w-6 h-6 text-gray-900" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">Sign out</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Are you sure you want to sign out? You will need to sign in again to access your dashboard.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    onLogout();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
