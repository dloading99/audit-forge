import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AuditDetail } from './pages/AuditDetail';
import { api } from './services/api';

// Simple router states
type Route = 
  | { name: 'dashboard' }
  | { name: 'audit', id: string };

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle hash changes for basic navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('/audit/')) {
        const id = hash.split('/')[2];
        setRoute({ name: 'audit', id });
      } else {
        setRoute({ name: 'dashboard' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Init
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (id: string) => {
    window.location.hash = `/audit/${id}`;
  };

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    
    setIsSubmitting(true);
    try {
      const audit = await api.createAudit({ url: urlInput });
      setShowNewAuditModal(false);
      setUrlInput('');
      handleNavigate(audit.id);
    } catch (err) {
      console.error(err);
      alert('Failed to start audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {route.name === 'dashboard' && (
        <Dashboard 
          onNavigate={handleNavigate} 
          onNewAudit={() => setShowNewAuditModal(true)} 
        />
      )}
      {route.name === 'audit' && (
        <AuditDetail auditId={route.id} />
      )}

      {/* New Audit Modal */}
      {showNewAuditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowNewAuditModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateAudit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-brand-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Start New Audit</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Enter the full URL of the website you want to analyze. The system will crawl up to 30 pages.
                        </p>
                        <div className="mt-4">
                          <label htmlFor="url" className="block text-sm font-medium text-gray-700">Website URL</label>
                          <input
                            type="url"
                            name="url"
                            id="url"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                            placeholder="https://example.com"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:ml-3 sm:w-auto sm:text-sm ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Starting...' : 'Run Analysis'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowNewAuditModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;