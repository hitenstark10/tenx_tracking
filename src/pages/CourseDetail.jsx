import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Modal from '../components/Modal';
import {
    ArrowLeft, Plus, Search, ChevronDown, ChevronRight, Check,
    Trash2, Edit3, FileText, PlayCircle, Upload, BookOpen
} from 'lucide-react';
import { getToday, getCourseProgress } from '../utils/helpers';
import './CourseDetail.css';

const emptyTopicForm = { name: '', priority: 'medium', date: '', startTime: '', endTime: '' };
const emptySubForm = { name: '', priority: 'medium', date: '', startTime: '', endTime: '' };

export default function CourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        courses, addTopic, updateTopic, deleteTopic,
        addSubtopic, updateSubtopic, deleteSubtopic,
        addResource, deleteResource,
    } = useData();

    const course = courses.find(c => c.id === id);
    if (!course) return (
        <div className="empty-state">
            <h4>Course not found</h4>
            <button className="btn btn-secondary" onClick={() => navigate('/courses')}>Back to Courses</button>
        </div>
    );

    const [expandedTopics, setExpandedTopics] = useState(new Set());
    const [topicModal, setTopicModal] = useState(false);
    const [editTopicData, setEditTopicData] = useState(null);
    const [subtopicModal, setSubtopicModal] = useState(null);
    const [editSubData, setEditSubData] = useState(null);
    const [resourceModal, setResourceModal] = useState(null);
    const [viewerModal, setViewerModal] = useState(null);
    const [searchQ, setSearchQ] = useState('');
    const [filterComplete, setFilterComplete] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [topicForm, setTopicForm] = useState({ ...emptyTopicForm });
    const [subtopicForm, setSubtopicForm] = useState({ ...emptySubForm });
    const [resourceForm, setResourceForm] = useState({ name: '', type: 'pdf', url: '' });

    const toggleExpand = (topicId) => {
        setExpandedTopics(prev => {
            const next = new Set(prev);
            next.has(topicId) ? next.delete(topicId) : next.add(topicId);
            return next;
        });
    };

    // ─── Topic CRUD ───
    const openAddTopic = () => {
        setEditTopicData(null);
        setTopicForm({ ...emptyTopicForm });
        setTopicModal(true);
    };
    const openEditTopic = (topic) => {
        setEditTopicData(topic);
        setTopicForm({ name: topic.name, priority: topic.priority || 'medium', date: topic.date || '', startTime: topic.startTime || '', endTime: topic.endTime || '' });
        setTopicModal(true);
    };
    const handleSaveTopic = () => {
        if (!topicForm.name.trim()) return;
        if (editTopicData) {
            updateTopic(course.id, editTopicData.id, { ...topicForm });
        } else {
            addTopic(course.id, { ...topicForm });
        }
        setTopicForm({ ...emptyTopicForm });
        setTopicModal(false);
        setEditTopicData(null);
    };

    // ─── Subtopic CRUD ───
    const openAddSub = (topicId) => {
        setEditSubData(null);
        setSubtopicModal(topicId);
        setSubtopicForm({ ...emptySubForm });
    };
    const openEditSub = (topicId, sub) => {
        setEditSubData({ topicId, sub });
        setSubtopicModal(topicId);
        setSubtopicForm({ name: sub.name, priority: sub.priority || 'medium', date: sub.date || '', startTime: sub.startTime || '', endTime: sub.endTime || '' });
    };
    const handleSaveSub = () => {
        if (!subtopicForm.name.trim() || !subtopicModal) return;
        if (editSubData) {
            updateSubtopic(course.id, editSubData.topicId, editSubData.sub.id, { ...subtopicForm });
        } else {
            addSubtopic(course.id, subtopicModal, { ...subtopicForm });
        }
        setSubtopicForm({ ...emptySubForm });
        setSubtopicModal(null);
        setEditSubData(null);
    };

    // ─── Resource ───
    const handleAddResource = () => {
        if (!resourceForm.name.trim() || !resourceModal) return;
        addResource(course.id, resourceModal.topicId, resourceModal.subtopicId || null, { ...resourceForm });
        setResourceForm({ name: '', type: 'pdf', url: '' });
        setResourceModal(null);
    };
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const type = file.type.includes('video') ? 'video' : 'pdf';
        setResourceForm({ name: file.name, type, url });
    };

    const progress = getCourseProgress(course);

    const filteredTopics = useMemo(() => {
        return (course.topics || []).filter(t => {
            if (searchQ) {
                const matchName = t.name.toLowerCase().includes(searchQ.toLowerCase());
                const matchSub = t.subtopics?.some(s => s.name.toLowerCase().includes(searchQ.toLowerCase()));
                if (!matchName && !matchSub) return false;
            }
            if (filterComplete === 'completed' && !t.completed) return false;
            if (filterComplete === 'pending' && t.completed) return false;
            if (filterPriority !== 'all' && (t.priority || 'medium') !== filterPriority) return false;
            return true;
        });
    }, [course.topics, searchQ, filterComplete, filterPriority]);

    const renderResources = (resources, topicId, subtopicId) => {
        if (!resources || resources.length === 0) return null;
        return (
            <div className="resource-list">
                {resources.map(res => (
                    <div key={res.id} className="resource-row" onClick={() => setViewerModal(res)}>
                        <div className="resource-indent" />
                        {res.type === 'video' ? <PlayCircle size={14} className="res-icon video" /> : <FileText size={14} className="res-icon pdf" />}
                        <span className="resource-name">{res.name}</span>
                        <span className="badge badge-info">{res.type}</span>
                        <button className="btn btn-ghost btn-icon btn-xs" onClick={(e) => { e.stopPropagation(); deleteResource(course.id, topicId, subtopicId, res.id); }}><Trash2 size={12} /></button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="course-detail">
            <div className="cd-header">
                <button className="btn btn-ghost" onClick={() => navigate('/courses')}><ArrowLeft size={18} /> Back</button>
                <div className="cd-header-info">
                    <h1>{course.name}</h1>
                    {course.description && <p className="cd-desc">{course.description}</p>}
                    <div className="cd-meta">
                        <span className={`badge badge-${course.priority}`}>{course.priority}</span>
                        <span className="cd-progress-text">{progress}% complete</span>
                    </div>
                    <div className="progress-bar" style={{ maxWidth: 300, marginTop: 8 }}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-wrapper"><Search size={16} /><input className="input" placeholder="Search topics & subtopics..." value={searchQ} onChange={e => setSearchQ(e.target.value)} /></div>
                <select className="select" value={filterComplete} onChange={e => setFilterComplete(e.target.value)} style={{ width: 140 }}>
                    <option value="all">All</option><option value="completed">Completed</option><option value="pending">Pending</option>
                </select>
                <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 140 }}>
                    <option value="all">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
                <button className="btn btn-primary" onClick={openAddTopic}><Plus size={16} /> Add Topic</button>
            </div>

            {filteredTopics.length === 0 ? (
                <div className="empty-state"><BookOpen size={48} /><h4>No topics yet</h4><p>Add your first topic to build the course</p></div>
            ) : (
                <div className="topic-tree">
                    {filteredTopics.map(topic => (
                        <div key={topic.id} className="topic-node">
                            <div className="topic-row">
                                <button className="expand-btn" onClick={() => toggleExpand(topic.id)}>{expandedTopics.has(topic.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                                <div className={`checkbox ${topic.completed ? 'checked' : ''}`} onClick={() => updateTopic(course.id, topic.id, { completed: !topic.completed, completedDate: !topic.completed ? getToday() : null })}>{topic.completed && <Check size={12} color="#fff" />}</div>
                                <span className={`topic-name ${topic.completed ? 'done' : ''}`}>{topic.name}</span>
                                <span className={`badge badge-${topic.priority || 'medium'}`}>{topic.priority || 'medium'}</span>
                                {topic.date && <span className="topic-date">{topic.date}</span>}
                                {topic.startTime && <span className="topic-time">{topic.startTime}–{topic.endTime || '?'}</span>}
                                <span className="topic-count">{topic.subtopics?.length || 0} sub</span>
                                <div className="topic-actions">
                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => setResourceModal({ topicId: topic.id, subtopicId: null })} title="Add resource"><Upload size={14} /></button>
                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => openAddSub(topic.id)} title="Add subtopic"><Plus size={14} /></button>
                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => openEditTopic(topic)}><Edit3 size={14} /></button>
                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => deleteTopic(course.id, topic.id)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                            {/* Topic-level resources */}
                            {expandedTopics.has(topic.id) && renderResources(topic.resources, topic.id, null)}
                            {/* Subtopics */}
                            {expandedTopics.has(topic.id) && topic.subtopics && (
                                <div className="subtopic-list">
                                    {topic.subtopics.map(sub => (
                                        <div key={sub.id} className="subtopic-node">
                                            <div className="subtopic-row">
                                                <div className="subtopic-indent" />
                                                <div className={`checkbox ${sub.completed ? 'checked' : ''}`} onClick={() => updateSubtopic(course.id, topic.id, sub.id, { completed: !sub.completed, completedDate: !sub.completed ? getToday() : null })}>{sub.completed && <Check size={12} color="#fff" />}</div>
                                                <span className={`subtopic-name ${sub.completed ? 'done' : ''}`}>{sub.name}</span>
                                                <span className={`badge badge-${sub.priority || 'medium'}`}>{sub.priority || 'medium'}</span>
                                                {sub.date && <span className="topic-date">{sub.date}</span>}
                                                {sub.startTime && <span className="topic-time">{sub.startTime}–{sub.endTime || '?'}</span>}
                                                <div className="topic-actions">
                                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => setResourceModal({ topicId: topic.id, subtopicId: sub.id })} title="Add resource"><Upload size={14} /></button>
                                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => openEditSub(topic.id, sub)}><Edit3 size={14} /></button>
                                                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => deleteSubtopic(course.id, topic.id, sub.id)}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            {renderResources(sub.resources, topic.id, sub.id)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Topic Modal */}
            <Modal isOpen={topicModal} onClose={() => { setTopicModal(false); setEditTopicData(null); }} title={editTopicData ? 'Edit Topic' : 'Add Topic'}
                footer={<><button className="btn btn-secondary" onClick={() => { setTopicModal(false); setEditTopicData(null); }}>Cancel</button><button className="btn btn-primary" onClick={handleSaveTopic}>{editTopicData ? 'Update' : 'Add'}</button></>}>
                <div className="modal-form">
                    <div className="input-group"><label>Name *</label><input className="input" placeholder="e.g., Supervised Learning" value={topicForm.name} onChange={e => setTopicForm({ ...topicForm, name: e.target.value })} /></div>
                    <div className="input-row">
                        <div className="input-group"><label>Priority</label><select className="select" value={topicForm.priority} onChange={e => setTopicForm({ ...topicForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                        <div className="input-group"><label>Date</label><input type="date" className="input" value={topicForm.date} onChange={e => setTopicForm({ ...topicForm, date: e.target.value })} /></div>
                    </div>
                    <div className="input-row">
                        <div className="input-group"><label>Start Time</label><input type="time" className="input" value={topicForm.startTime} onChange={e => setTopicForm({ ...topicForm, startTime: e.target.value })} /></div>
                        <div className="input-group"><label>End Time</label><input type="time" className="input" value={topicForm.endTime} onChange={e => setTopicForm({ ...topicForm, endTime: e.target.value })} /></div>
                    </div>
                </div>
            </Modal>

            {/* Subtopic Modal */}
            <Modal isOpen={!!subtopicModal} onClose={() => { setSubtopicModal(null); setEditSubData(null); }} title={editSubData ? 'Edit Subtopic' : 'Add Subtopic'}
                footer={<><button className="btn btn-secondary" onClick={() => { setSubtopicModal(null); setEditSubData(null); }}>Cancel</button><button className="btn btn-primary" onClick={handleSaveSub}>{editSubData ? 'Update' : 'Add'}</button></>}>
                <div className="modal-form">
                    <div className="input-group"><label>Name *</label><input className="input" placeholder="e.g., Linear Regression" value={subtopicForm.name} onChange={e => setSubtopicForm({ ...subtopicForm, name: e.target.value })} /></div>
                    <div className="input-row">
                        <div className="input-group"><label>Priority</label><select className="select" value={subtopicForm.priority} onChange={e => setSubtopicForm({ ...subtopicForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                        <div className="input-group"><label>Date</label><input type="date" className="input" value={subtopicForm.date} onChange={e => setSubtopicForm({ ...subtopicForm, date: e.target.value })} /></div>
                    </div>
                    <div className="input-row">
                        <div className="input-group"><label>Start Time</label><input type="time" className="input" value={subtopicForm.startTime} onChange={e => setSubtopicForm({ ...subtopicForm, startTime: e.target.value })} /></div>
                        <div className="input-group"><label>End Time</label><input type="time" className="input" value={subtopicForm.endTime} onChange={e => setSubtopicForm({ ...subtopicForm, endTime: e.target.value })} /></div>
                    </div>
                </div>
            </Modal>

            {/* Resource Modal */}
            <Modal isOpen={!!resourceModal} onClose={() => setResourceModal(null)} title="Upload Resource"
                footer={<><button className="btn btn-secondary" onClick={() => setResourceModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleAddResource}>Add Resource</button></>}>
                <div className="modal-form">
                    <div className="input-group"><label>Upload File (PDF / Video / Doc)</label><input type="file" accept=".pdf,.doc,.docx,video/*" className="input" onChange={handleFileUpload} /></div>
                    <div className="input-group"><label>Resource Name</label><input className="input" value={resourceForm.name} onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })} /></div>
                    <div className="input-group"><label>Type</label><select className="select" value={resourceForm.type} onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })}><option value="pdf">PDF</option><option value="video">Video</option><option value="doc">Doc</option></select></div>
                    <div className="input-group"><label>Or paste URL</label><input className="input" placeholder="https://..." value={resourceForm.url} onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })} /></div>
                </div>
            </Modal>

            {/* Resource Viewer — Full Browser Window */}
            {viewerModal && (
                <div className="resource-fullscreen-overlay">
                    <div className="resource-fullscreen-header">
                        <div className="resource-fullscreen-title">
                            {viewerModal.type === 'video' ? <PlayCircle size={18} /> : <FileText size={18} />}
                            <span>{viewerModal.name}</span>
                            <span className="badge badge-info" style={{ marginLeft: 8 }}>{viewerModal.type}</span>
                        </div>
                        <button className="btn btn-ghost btn-icon resource-fullscreen-close" onClick={() => setViewerModal(null)} title="Close">
                            ✕
                        </button>
                    </div>
                    <div className="resource-fullscreen-body">
                        {viewerModal.type === 'video' ? (
                            <video src={viewerModal.url} controls autoPlay className="resource-fullscreen-video">
                                Your browser does not support video playback.
                            </video>
                        ) : viewerModal.type === 'doc' || viewerModal.name?.match(/\.(doc|docx)$/i) ? (
                            <iframe
                                src={`https://docs.google.com/gview?url=${encodeURIComponent(viewerModal.url)}&embedded=true`}
                                className="resource-fullscreen-iframe"
                                title={viewerModal.name}
                            />
                        ) : (
                            <iframe
                                src={viewerModal.url}
                                className="resource-fullscreen-iframe"
                                title={viewerModal.name}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
