function TabButton({ tab, isActive, onClick, controlsId }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={controlsId}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.15em] uppercase font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-stone-900 text-stone-900'
          : 'border-transparent text-stone-400 hover:text-stone-700'
      }`}
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {tab.label}
    </button>
  );
}

/**
 * Stateless / fully controlled tab strip.
 *
 * @param {object} props
 * @param {string} props.activeTab id of the currently active tab
 * @param {(id: string) => void} props.onActiveTabChange invoked when an inactive tab is clicked
 * @param {Array<{id: string, label: string, body: import('react').ReactNode}>} props.tabs
 */
export default function CardTabs({ activeTab, onActiveTabChange, tabs }) {
  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const panelId = `tabpanel-${active.id}`;
  return (
    <div>
      <div
        role="tablist"
        className="flex items-center gap-1 border-b border-stone-200"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={tab.id === active.id}
            controlsId={panelId}
            onClick={() => {
              if (tab.id !== active.id) onActiveTabChange(tab.id);
            }}
          />
        ))}
      </div>
      <div role="tabpanel" id={panelId} className="pt-4">
        {active.body}
      </div>
    </div>
  );
}
