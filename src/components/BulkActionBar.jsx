import { Check } from 'lucide-react'
import SearchableSelect from './SearchableSelect'
import HybridLookup from './HybridLookup'

export default function BulkActionBar({ selectedCount, actionTypes, correctiveSuggestions, actionTypeId, onActionTypeChange, correctiveAction, onCorrectiveChange, onApply, onClose }) {
  return (
    <div className="bulk-action-bar">
      <div className="bulk-selected-count"><strong>{selectedCount}</strong><span>selected</span></div>
      <SearchableSelect
        value={actionTypeId}
        onChange={onActionTypeChange}
        options={actionTypes}
        getValue={(item) => item.action_type_id}
        getLabel={(item) => item.action_name}
        placeholder="Action Type"
        className="bulk-action-type"
      />
      <HybridLookup
        value={correctiveAction}
        onChange={onCorrectiveChange}
        suggestions={correctiveSuggestions}
        placeholder="Corrective Action"
        className="bulk-corrective"
      />
      <button type="button" className="button secondary compact" disabled={!selectedCount || (!actionTypeId && !correctiveAction.trim())} onClick={onApply}>Apply to selected</button>
      <button type="button" className="button solve-bulk compact" disabled={!selectedCount} onClick={onClose}><Check size={15} /> Close selected</button>
    </div>
  )
}
