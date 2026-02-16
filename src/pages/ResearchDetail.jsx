import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { LineChart } from '../components/Charts';
import Modal from '../components/Modal';
import {
    ArrowLeft, ExternalLink, FileText, Upload, Trash2,
    PlayCircle, StickyNote, Plus, TrendingUp, X
} from 'lucide-react';
import { getToday } from '../utils/helpers';
import './ResearchDetail.css';

export default function ResearchDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { researchPapers, updateResearchPaper, addPaperResource, deletePaperResource } = useData();
    const paper = researchPapers.find(p => p.id === id);

    const [resourceModal, setResourceModal] = useState(false);
    const [resForm, setResForm] = useState({ name: '', type: 'pdf', url: '' });
    const [fullscreenResource, setFullscreenResource] = useState(null);

    if (!paper) return (
        <div className="empty-state">
            <h4>Paper not found</h4>
            <button className="btn btn-secondary" onClick={() => navigate('/research')}>Back to Research</button>
        </div>
    );

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const type = file.type.includes('video') ? 'video' : 'pdf';
        setResForm({ name: file.name, type, url });
    };

    const handleAddResource = () => {
        if (!resForm.name.trim()) return;
        addPaperResource(paper.id, { ...resForm });
        setResForm({ name: '', type: 'pdf', url: '' });
        setResourceModal(false);
    };

    // Progress over time chart data
    const progressHistory = paper.progressHistory || [];
    const chartLabels = progressHistory.map(entry => entry.date);
    const chartData = progressHistory.map(entry => entry.percentage);
    // If no history, show current as single point
    const hasHistory = chartLabels.length > 0;

    const openFullscreen = (res) => {
        setFullscreenResource(res);
    };

    const closeFullscreen = () => {
        setFullscreenResource(null);
    };

    return (
        <div className="research-detail">
            <button className="btn btn-ghost" onClick={() => navigate('/research')}>
                <ArrowLeft size={18} /> Back to Research
            </button>

            {/* Paper Header */}
            <div className="rd-header">
                <div className="rd-header-top">
                    <h1>{paper.name}</h1>
                    <span className={`badge badge-${paper.priority}`}>{paper.priority}</span>
                </div>
                {paper.author && <p className="rd-author">by <strong>{paper.author}</strong></p>}
                {paper.description && <p className="rd-desc">{paper.description}</p>}
                <div className="rd-meta">
                    <span>Completion: <strong>{paper.completionPercentage}%</strong></span>
                    {paper.startDate && <span>Start: {paper.startDate}</span>}
                    {paper.endDate && <span>End: {paper.endDate}</span>}
                </div>
                <div className="progress-bar" style={{ maxWidth: 400, marginTop: 8 }}>
                    <div className="progress-fill" style={{ width: `${paper.completionPercentage}%` }} />
                </div>
                {paper.paperUrl && (
                    <a href={paper.paperUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
                        <ExternalLink size={14} /> View Original Paper
                    </a>
                )}
            </div>

            {/* Progress Chart */}
            <div className="rd-progress-chart card">
                <h4><TrendingUp size={18} /> Progress Over Time</h4>
                {hasHistory ? (
                    <LineChart
                        labels={chartLabels}
                        datasets={[{ label: 'Completion %', data: chartData }]}
                        height={220}
                    />
                ) : (
                    <div className="rd-no-history">
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)', padding: '20px 0' }}>
                            Progress history will appear here as you update the completion percentage over time.
                            Current: <strong>{paper.completionPercentage}%</strong>
                        </p>
                    </div>
                )}
            </div>

            {/* Main Document Viewer */}
            {paper.documentUrl && (
                <div className="rd-document card">
                    <div className="rd-doc-header">
                        <h4><FileText size={18} /> Original Paper Document</h4>
                        <button className="btn btn-secondary btn-sm" onClick={() => openFullscreen({ name: 'Original Paper', type: 'pdf', url: paper.documentUrl })}>
                            Open Full Size
                        </button>
                    </div>
                    <iframe src={paper.documentUrl} className="rd-doc-frame" title="Paper Document" />
                </div>
            )}

            {/* Notes Section */}
            <div className="rd-notes card">
                <h4><StickyNote size={18} /> Notes</h4>
                <textarea
                    className="textarea"
                    style={{ minHeight: 150 }}
                    placeholder="Write your research notes here..."
                    value={paper.notes || ''}
                    onChange={(e) => updateResearchPaper(paper.id, { notes: e.target.value })}
                />
            </div>

            {/* Additional Resources */}
            <div className="rd-resources card">
                <div className="rd-resources-header">
                    <h4><Upload size={18} /> Notes & Media Resources</h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setResourceModal(true)}>
                        <Plus size={14} /> Add Resource
                    </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>
                    Upload notes, PDFs, docs, TXT files, or videos. Click to view in fullscreen.
                </p>
                {(!paper.additionalResources || paper.additionalResources.length === 0) ? (
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)', padding: '16px 0' }}>No resources added yet. Upload notes, videos, or reference materials.</p>
                ) : (
                    <div className="rd-resource-list">
                        {paper.additionalResources.map(res => (
                            <div key={res.id} className="rd-resource-row" onClick={() => openFullscreen(res)}>
                                {res.type === 'video' ? <PlayCircle size={16} className="res-icon video" /> : <FileText size={16} className="res-icon pdf" />}
                                <span className="resource-name">{res.name}</span>
                                <span className="badge badge-info">{res.type}</span>
                                <button className="btn btn-ghost btn-icon btn-xs" onClick={(e) => { e.stopPropagation(); deletePaperResource(paper.id, res.id); }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Resource Modal */}
            <Modal isOpen={resourceModal} onClose={() => setResourceModal(false)} title="Add Resource"
                footer={<><button className="btn btn-secondary" onClick={() => setResourceModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddResource}>Add</button></>}>
                <div className="modal-form">
                    <div className="input-group"><label>Upload File</label><input type="file" accept=".pdf,.doc,.docx,.txt,video/*" className="input" onChange={handleFileUpload} /></div>
                    <div className="input-group"><label>Resource Name</label><input className="input" value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} /></div>
                    <div className="input-group"><label>Type</label>
                        <select className="select" value={resForm.type} onChange={e => setResForm({ ...resForm, type: e.target.value })}>
                            <option value="pdf">PDF</option><option value="video">Video</option><option value="notes">Notes</option><option value="doc">Doc</option><option value="txt">TXT</option>
                        </select>
                    </div>
                    <div className="input-group"><label>Or paste URL</label><input className="input" placeholder="https://..." value={resForm.url} onChange={e => setResForm({ ...resForm, url: e.target.value })} /></div>
                </div>
            </Modal>

            {/* Fullscreen Viewer */}
            {fullscreenResource && (
                <div className="fullscreen-viewer" onClick={closeFullscreen}>
                    <div className="fullscreen-header" onClick={e => e.stopPropagation()}>
                        <h3>{fullscreenResource.name}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={closeFullscreen}><X size={20} /></button>
                    </div>
                    <div className="fullscreen-body" onClick={e => e.stopPropagation()}>
                        {fullscreenResource.type === 'video' ? (
                            <video src={fullscreenResource.url} controls className="fullscreen-video">Not supported</video>
                        ) : (
                            <iframe src={fullscreenResource.url} className="fullscreen-iframe" title={fullscreenResource.name} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
