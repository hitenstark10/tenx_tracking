import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Modal from '../components/Modal';
import { LineChart } from '../components/Charts';
import { Plus, FileText, Search, Trash2, Edit3, Eye, Calendar, User } from 'lucide-react';
import { getToday, getLast7Days, getLast30Days, formatDateShort } from '../utils/helpers';
import './Research.css';

export default function Research() {
    const { researchPapers, addResearchPaper, updateResearchPaper, deleteResearchPaper } = useData();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [editPaper, setEditPaper] = useState(null);
    const [form, setForm] = useState({
        name: '', description: '', author: '', priority: 'medium',
        startDate: getToday(), endDate: '', completionPercentage: 0,
        documentUrl: '', paperUrl: ''
    });
    const [searchQ, setSearchQ] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterCompletion, setFilterCompletion] = useState('all');
    const [timeRange, setTimeRange] = useState('7');

    const resetForm = () => setForm({ name: '', description: '', author: '', priority: 'medium', startDate: getToday(), endDate: '', completionPercentage: 0, documentUrl: '', paperUrl: '' });

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!form.name.trim()) return;
        if (editPaper) {
            updateResearchPaper(editPaper.id, { ...form, lastUpdated: getToday() });
            setEditPaper(null);
        } else {
            addResearchPaper({ ...form, lastUpdated: getToday() });
        }
        resetForm();
        setModalOpen(false);
    };

    const openEdit = (paper) => {
        setForm({
            name: paper.name, description: paper.description || '', author: paper.author || '',
            priority: paper.priority, startDate: paper.startDate || '', endDate: paper.endDate || '',
            completionPercentage: paper.completionPercentage || 0,
            documentUrl: paper.documentUrl || '', paperUrl: paper.paperUrl || ''
        });
        setEditPaper(paper);
        setModalOpen(true);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setForm({ ...form, documentUrl: url, name: form.name || file.name });
    };

    const filtered = useMemo(() => {
        return researchPapers.filter(p => {
            if (searchQ && !p.name.toLowerCase().includes(searchQ.toLowerCase()) && !(p.author || '').toLowerCase().includes(searchQ.toLowerCase())) return false;
            if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
            if (filterCompletion === 'completed' && p.completionPercentage < 100) return false;
            if (filterCompletion === 'in-progress' && (p.completionPercentage <= 0 || p.completionPercentage >= 100)) return false;
            if (filterCompletion === 'not-started' && p.completionPercentage > 0) return false;
            return true;
        });
    }, [researchPapers, searchQ, filterPriority, filterCompletion]);

    const days = timeRange === '7' ? getLast7Days() : getLast30Days();
    const labels = days.map(d => formatDateShort(d));
    const completionData = days.map(d => researchPapers.filter(p => p.lastUpdated === d).reduce((s, p) => s + (p.completionPercentage || 0), 0));

    return (
        <div className="research-page">
            <div className="page-header">
                <h1><FileText size={28} /> Research Papers</h1>
                <button className="btn btn-primary" onClick={() => { setEditPaper(null); resetForm(); setModalOpen(true); }}><Plus size={16} /> Add Paper</button>
            </div>

            <div className="filter-bar">
                <div className="search-wrapper"><Search size={16} /><input className="input" placeholder="Search by name or author..." value={searchQ} onChange={e => setSearchQ(e.target.value)} /></div>
                <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 140 }}><option value="all">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                <select className="select" value={filterCompletion} onChange={e => setFilterCompletion(e.target.value)} style={{ width: 160 }}><option value="all">All Status</option><option value="completed">Completed</option><option value="in-progress">In Progress</option><option value="not-started">Not Started</option></select>
            </div>

            <div className="research-analytics card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Research Progress</h4>
                    <div className="tabs">
                        <button className={`tab ${timeRange === '7' ? 'active' : ''}`} onClick={() => setTimeRange('7')}>7d</button>
                        <button className={`tab ${timeRange === '30' ? 'active' : ''}`} onClick={() => setTimeRange('30')}>30d</button>
                    </div>
                </div>
                <LineChart labels={labels} datasets={[{ label: 'Completion Sum (%)', data: completionData }]} height={200} />
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><FileText size={48} /><h4>No research papers yet</h4><p>Add your first paper to track progress</p></div>
            ) : (
                <div className="paper-grid">
                    {filtered.map(paper => (
                        <div key={paper.id} className="card paper-card">
                            <div className="paper-card-header">
                                <h3 className="paper-card-name">{paper.name}</h3>
                                <span className={`badge badge-${paper.priority}`}>{paper.priority}</span>
                            </div>
                            {paper.author && <p className="paper-card-author"><User size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />by {paper.author}</p>}
                            {paper.description && <p className="paper-card-desc">{paper.description}</p>}
                            {/* Dates Row */}
                            {(paper.startDate || paper.endDate) && (
                                <div className="paper-card-dates">
                                    <Calendar size={12} />
                                    {paper.startDate && <span>{paper.startDate}</span>}
                                    {paper.startDate && paper.endDate && <span>→</span>}
                                    {paper.endDate && <span>{paper.endDate}</span>}
                                </div>
                            )}
                            <div className="paper-card-progress">
                                <div className="progress-bar"><div className="progress-fill" style={{ width: `${paper.completionPercentage}%` }} /></div>
                                <span className="progress-label">{paper.completionPercentage}%</span>
                            </div>
                            <div className="paper-slider-row">
                                <input type="range" min="0" max="100" step="5" value={paper.completionPercentage}
                                    onChange={(e) => updateResearchPaper(paper.id, { completionPercentage: parseInt(e.target.value), lastUpdated: getToday() })}
                                    className="paper-slider" />
                            </div>
                            <div className="paper-card-footer">
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/research/${paper.id}`)}><Eye size={14} /> View</button>
                                <div className="paper-card-actions">
                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => openEdit(paper)}><Edit3 size={14} /></button>
                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => { if (confirm('Delete?')) deleteResearchPaper(paper.id); }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditPaper(null); }} title={editPaper ? 'Edit Paper' : 'Add Research Paper'}
                footer={<><button className="btn btn-secondary" onClick={() => { setModalOpen(false); setEditPaper(null); }}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editPaper ? 'Update' : 'Add'}</button></>}>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="input-group"><label>Paper Name *</label><input className="input" placeholder="e.g., Attention Is All You Need" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="input-group"><label>Author(s)</label><input className="input" placeholder="e.g., Vaswani et al." value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} /></div>
                    <div className="input-group"><label>Description</label><textarea className="textarea" placeholder="Paper summary..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="input-row">
                        <div className="input-group"><label>Priority</label><select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                        <div className="input-group"><label>Completion %</label><input type="number" className="input" min="0" max="100" value={form.completionPercentage} onChange={e => setForm({ ...form, completionPercentage: parseInt(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="input-row">
                        <div className="input-group"><label>Start Date</label><input type="date" className="input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                        <div className="input-group"><label>End Date</label><input type="date" className="input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                    </div>
                    <div className="input-group"><label>Paper URL (original)</label><input className="input" placeholder="https://arxiv.org/..." value={form.paperUrl} onChange={e => setForm({ ...form, paperUrl: e.target.value })} /></div>
                    <div className="input-group"><label>Upload Document (PDF/TXT/DOC)</label><input type="file" accept=".pdf,.txt,.doc,.docx" className="input" onChange={handleFileUpload} /></div>
                </form>
            </Modal>
        </div>
    );
}
