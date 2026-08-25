import { Check, Edit3, Loader2, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import SearchableSelect from './SearchableSelect'

const DEFINITIONS = [
  {
    key: 'sites', table: 'sites', id: 'site_id', idPrefix: 'SITE', label: 'Sites', singular: 'Site',
    fields: [
      { key: 'site_code', label: 'Site Code', required: true },
      { key: 'site_name', label: 'Site Name', required: true },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'shifts', table: 'shifts', id: 'shift_id', idPrefix: 'SHIFT', label: 'Shifts', singular: 'Shift',
    fields: [
      { key: 'shift_name', label: 'Shift Name', required: true },
      { key: 'start_time', label: 'Start Time', type: 'time' },
      { key: 'end_time', label: 'End Time', type: 'time' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'units', table: 'units', id: 'unit_id', label: 'Units', singular: 'Unit', maxVisible: 700,
    fields: [
      { key: 'unit_no', label: 'Unit No', required: true },
      { key: 'device_id', label: 'Device ID' },
      { key: 'device_ip', label: 'Device IP' },
      { key: 'site_id', label: 'Site', type: 'select', optionsKey: 'sites', optionValue: 'site_id', optionLabel: 'site_code' },
      { key: 'unit_type', label: 'Unit Type' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    listFields: ['unit_no', 'device_id', 'device_ip', 'site_id'],
  },
  {
    key: 'issueTypes', table: 'issue_types', id: 'issue_type_id', idPrefix: 'ISSUE', label: 'Issue Types', singular: 'Issue Type',
    fields: [
      { key: 'issue_name', label: 'Issue Name', required: true },
      { key: 'issue_code', label: 'Issue Code' },
      { key: 'default_description', label: 'Default Description', type: 'textarea' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'issueDescriptions', table: 'issue_descriptions', id: 'description_id', label: 'Issue Descriptions', singular: 'Issue Description', maxVisible: 700,
    fields: [
      { key: 'description', label: 'Description', required: true, type: 'textarea' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'people', table: 'people', id: 'person_id', idPrefix: 'PERSON', label: 'Responders', singular: 'Responder',
    fields: [
      { key: 'display_name', label: 'Display Name', required: true },
      { key: 'full_name', label: 'Full Name', required: true },
      { key: 'email', label: 'Email' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'actionTypes', table: 'action_types', id: 'action_type_id', idPrefix: 'ACTION', label: 'Action Types', singular: 'Action Type',
    fields: [
      { key: 'action_name', label: 'Action Name', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'correctiveActions', table: 'corrective_actions', id: 'corrective_action_id', label: 'Corrective Actions', singular: 'Corrective Action', maxVisible: 700,
    fields: [
      { key: 'corrective_action', label: 'Corrective Action', required: true, type: 'textarea' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'statuses', table: 'statuses', id: 'status_id', label: 'Statuses', singular: 'Status', allowAdd: false, lockActive: true,
    fields: [
      { key: 'status_name', label: 'Status', readOnly: true },
      { key: 'color', label: 'Color' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'presets', table: 'ticket_presets', id: 'preset_id', label: 'Ticket Presets', singular: 'Preset',
    fields: [
      { key: 'preset_name', label: 'Preset Name', required: true },
      { key: 'issue_type_id', label: 'Issue Type', type: 'select', optionsKey: 'issueTypes', optionValue: 'issue_type_id', optionLabel: 'issue_name', required: true },
      { key: 'issue_description_id', label: 'Issue Description', type: 'select', optionsKey: 'issueDescriptions', optionValue: 'description_id', optionLabel: 'description' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
]

const DEF_BY_KEY = new Map(DEFINITIONS.map((item) => [item.key, item]))

export default function MasterData({ notify, onChanged }) {
  const [activeKey, setActiveKey] = useState('sites')
  const [rowsByKey, setRowsByKey] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const results = await Promise.all(DEFINITIONS.map((def) => supabase.from(def.table).select('*').limit(10000)))
    const error = results.find((item) => item.error)?.error
    if (error) {
      notify(error.message, 'error')
      setLoading(false)
      return
    }
    const next = {}
    DEFINITIONS.forEach((def, index) => {
      next[def.key] = sortRows(def, results[index].data || [])
    })
    setRowsByKey(next)
    setLoading(false)
  }

  const def = DEF_BY_KEY.get(activeKey)
  const rows = rowsByKey[activeKey] || []
  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => rowSearchText(def, row, rowsByKey).includes(needle))
  }, [def, rows, rowsByKey, search])
  const visibleRows = filteredRows.slice(0, def.maxVisible || 500)
  const listFields = (def.listFields || def.fields.map((field) => field.key).slice(0, 4)).map((key) => def.fields.find((field) => field.key === key)).filter(Boolean)

  function switchSection(key) {
    setActiveKey(key)
    setSearch('')
    setEditor(null)
  }

  function openAdd() {
    const maxSort = rows.reduce((max, row) => Math.max(max, Number(row.sort_order || 0)), 0)
    const form = { is_active: true, sort_order: maxSort + 1 }
    for (const field of def.fields) if (!(field.key in form)) form[field.key] = ''
    setEditor({ mode: 'add', row: null, form })
  }

  function openEdit(row) {
    const form = { is_active: row.is_active !== false }
    for (const field of def.fields) form[field.key] = row[field.key] ?? ''
    setEditor({ mode: 'edit', row, form })
  }

  function updateForm(key, value) {
    setEditor((current) => ({ ...current, form: { ...current.form, [key]: value } }))
  }

  async function saveEditor(event) {
    event.preventDefault()
    if (!editor) return
    for (const field of def.fields) {
      if (field.required && !String(editor.form[field.key] ?? '').trim()) return notify(`${field.label} wajib diisi.`, 'error')
    }

    const payload = {}
    for (const field of def.fields) {
      if (field.readOnly) continue
      const raw = editor.form[field.key]
      if (field.type === 'number') payload[field.key] = Number(raw || 0)
      else if (field.type === 'time' || field.type === 'select') payload[field.key] = raw || null
      else payload[field.key] = raw === '' ? null : raw
    }
    if (!def.lockActive) payload.is_active = editor.form.is_active !== false
    if (editor.mode === 'add' && def.idPrefix) payload[def.id] = makeTextId(def.idPrefix)

    setSaving(true)
    const request = editor.mode === 'add'
      ? supabase.from(def.table).insert(payload)
      : supabase.from(def.table).update(payload).eq(def.id, editor.row[def.id])
    const { error } = await request
    setSaving(false)
    if (error) return notify(error.message, 'error')

    notify(`${def.singular} saved.`, 'success')
    setEditor(null)
    await loadAll()
    await onChanged?.()
  }

  async function toggleActive(row) {
    if (def.lockActive) return
    const nextValue = row.is_active === false
    const snapshot = rowsByKey
    setRowsByKey((current) => ({
      ...current,
      [def.key]: (current[def.key] || []).map((item) => item[def.id] === row[def.id] ? { ...item, is_active: nextValue } : item),
    }))
    const { error } = await supabase.from(def.table).update({ is_active: nextValue }).eq(def.id, row[def.id])
    if (error) {
      setRowsByKey(snapshot)
      return notify(error.message, 'error')
    }
    notify(`${def.singular} ${nextValue ? 'activated' : 'deactivated'}.`, 'success')
    await onChanged?.()
  }

  return (
    <section className="master-data-page">
      <header className="master-page-header">
        <div><div className="eyebrow">Configuration</div><h1>Master Data</h1></div>
      </header>

      <div className="master-layout">
        <aside className="master-nav">
          {DEFINITIONS.map((item) => (
            <button key={item.key} className={activeKey === item.key ? 'active' : ''} onClick={() => switchSection(item.key)}>
              <span>{item.label}</span><small>{(rowsByKey[item.key] || []).length}</small>
            </button>
          ))}
        </aside>

        <div className="master-panel">
          <header className="master-toolbar">
            <div><strong>{def.label}</strong><span>{filteredRows.length} records</span></div>
            <div className="master-toolbar-actions">
              <label className="master-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${def.label.toLowerCase()}…`} /></label>
              {def.allowAdd !== false && <button className="button primary compact" onClick={openAdd}><Plus size={15} /> Add</button>}
            </div>
          </header>

          {loading ? <div className="master-loading"><Loader2 className="spin" /><span>Loading master data…</span></div> : (
            <div className="master-table-shell">
              <table className="master-table">
                <thead><tr>{listFields.map((field) => <th key={field.key}>{field.label}</th>)}<th>Active</th><th></th></tr></thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={String(row[def.id])}>
                      {listFields.map((field) => <td key={field.key} title={String(displayValue(field, row, rowsByKey) || '')}>{displayValue(field, row, rowsByKey) || '—'}</td>)}
                      <td><span className={`master-state ${row.is_active === false ? 'inactive' : 'active'}`}>{row.is_active === false ? 'Inactive' : 'Active'}</span></td>
                      <td className="master-row-actions">
                        <button type="button" onClick={() => openEdit(row)}><Edit3 size={13} /> Edit</button>
                        {!def.lockActive && <button type="button" onClick={() => toggleActive(row)}>{row.is_active === false ? <><Check size={13} /> Activate</> : 'Deactivate'}</button>}
                      </td>
                    </tr>
                  ))}
                  {!visibleRows.length && <tr><td colSpan={listFields.length + 2}><div className="master-empty">No matching records</div></td></tr>}
                </tbody>
              </table>
              {filteredRows.length > visibleRows.length && <div className="master-cap">Showing first {visibleRows.length}. Use search to narrow the list.</div>}
            </div>
          )}
        </div>
      </div>

      {editor && <EditorModal def={def} editor={editor} rowsByKey={rowsByKey} saving={saving} onClose={() => setEditor(null)} onChange={updateForm} onSave={saveEditor} />}
    </section>
  )
}

function EditorModal({ def, editor, rowsByKey, saving, onClose, onChange, onSave }) {
  return (
    <div className="modal-backdrop master-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="master-editor">
        <header><div><span>{editor.mode === 'add' ? 'Add' : 'Edit'}</span><h2>{def.singular}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></header>
        <form onSubmit={onSave}>
          <div className="master-editor-fields">
            {def.fields.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'master-field-wide' : ''}>
                <span>{field.label}{field.required ? ' *' : ''}</span>
                {field.type === 'select' ? (
                  <SearchableSelect
                    value={editor.form[field.key] || ''}
                    onChange={(value) => onChange(field.key, value)}
                    options={(rowsByKey[field.optionsKey] || []).filter((item) => item.is_active !== false || String(item[field.optionValue]) === String(editor.form[field.key]))}
                    getValue={(item) => item[field.optionValue]}
                    getLabel={(item) => item[field.optionLabel]}
                    placeholder={`Select ${field.label.toLowerCase()}`}
                    clearable={!field.required}
                  />
                ) : field.type === 'textarea' ? (
                  <textarea rows="3" value={editor.form[field.key] ?? ''} disabled={field.readOnly} onChange={(event) => onChange(field.key, event.target.value)} />
                ) : (
                  <input type={field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : 'text'} value={editor.form[field.key] ?? ''} disabled={field.readOnly} onChange={(event) => onChange(field.key, event.target.value)} />
                )}
              </label>
            ))}
            {!def.lockActive && <label className="master-active-toggle"><input type="checkbox" checked={editor.form.is_active !== false} onChange={(event) => onChange('is_active', event.target.checked)} /><span>Active</span></label>}
          </div>
          <footer><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving && <Loader2 size={15} className="spin" />} Save</button></footer>
        </form>
      </section>
    </div>
  )
}

function displayValue(field, row, rowsByKey) {
  const value = row[field.key]
  if (field.type !== 'select') return value
  const option = (rowsByKey[field.optionsKey] || []).find((item) => String(item[field.optionValue]) === String(value))
  return option?.[field.optionLabel] || value
}

function rowSearchText(def, row, rowsByKey) {
  return def.fields.map((field) => displayValue(field, row, rowsByKey)).concat(row.is_active === false ? 'inactive' : 'active').join(' ').toLowerCase()
}

function sortRows(def, rows) {
  const labelField = def.fields.find((field) => !['number', 'time', 'select'].includes(field.type))?.key
  return [...rows].sort((a, b) => {
    const sortA = Number(a.sort_order || 0)
    const sortB = Number(b.sort_order || 0)
    if (sortA !== sortB) return sortA - sortB
    return String(a[labelField] || '').localeCompare(String(b[labelField] || ''), undefined, { numeric: true, sensitivity: 'base' })
  })
}

function makeTextId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${suffix}`
}
