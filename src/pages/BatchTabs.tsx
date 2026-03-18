import { useState, useCallback, useRef } from 'react';
import { X, Package } from 'lucide-react';
import BatchesPage from './Batches';
import BatchInfoPage from './Batchinfo';

interface Tab {
  id: string;
  label: string;
  type: 'list' | 'detail';
  batchId?: string;
}

export default function BatchTabsPage() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'list', label: 'Lotes', type: 'list' },
  ]);
  const [activeTab, setActiveTab] = useState('list');
  const scrollPositions = useRef<Record<string, number>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const switchTab = useCallback((tabId: string) => {
    // Guardar scroll actual
    const currentEl = containerRefs.current[activeTab];
    if (currentEl) {
      scrollPositions.current[activeTab] = currentEl.scrollTop;
    }
    setActiveTab(tabId);
    // Restaurar scroll del tab destino
    requestAnimationFrame(() => {
      const targetEl = containerRefs.current[tabId];
      if (targetEl && scrollPositions.current[tabId] !== undefined) {
        targetEl.scrollTop = scrollPositions.current[tabId];
      }
    });
  }, [activeTab]);

  const openBatchTab = useCallback((batchId: string, batchNumber: string) => {
    const existing = tabs.find(t => t.batchId === batchId);
    if (existing) {
      switchTab(existing.id);
      return;
    }

    const newTab: Tab = {
      id: `batch-${batchId}`,
      label: batchNumber,
      type: 'detail',
      batchId,
    };
    setTabs(prev => [...prev, newTab]);
    switchTab(newTab.id);
  }, [tabs, switchTab]);

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    delete scrollPositions.current[tabId];
    delete containerRefs.current[tabId];
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTab === tabId) {
      switchTab('list');
    }
  }, [activeTab, switchTab]);

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Tabs Bar */}
      <div className="flex items-center gap-1 bg-kawa-black border-b border-gray-800 px-2 pt-2 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-kawa-gray text-white border-t-2 border-kawa-green'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.type === 'list' ? (
              <Package size={14} />
            ) : null}
            {tab.label}
            {tab.type === 'detail' && (
              <span
                onClick={(e) => closeTab(tab.id, e)}
                className="ml-1 p-0.5 rounded hover:bg-gray-600 transition-colors"
              >
                <X size={12} />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - cada tab tiene su propio scroll */}
      <div className="flex-1 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={(el) => { containerRefs.current[tab.id] = el; }}
            className={`absolute inset-0 overflow-y-auto ${activeTab === tab.id ? '' : 'hidden'}`}
          >
            <div className="p-6">
              {tab.type === 'list' ? (
                <BatchesPage onOpenBatch={openBatchTab} />
              ) : tab.batchId ? (
                <BatchInfoPage 
                  batchId={tab.batchId} 
                  onBack={() => switchTab('list')}
                  onDeleted={() => closeTab(tab.id, { stopPropagation: () => {} } as React.MouseEvent)}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
