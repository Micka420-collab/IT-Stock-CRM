import { useState, useEffect } from 'react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useGamification } from '../context/GamificationContext';
import TutorialButton from '../components/TutorialButton';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import CSVImportModal from '../components/CSVImportModal';
import { Search, Plus, Minus, AlertTriangle, Monitor, Battery, Keyboard, Mouse, Smartphone, Cable, Layers, Box, User, Package, Trash2, Edit2, CheckCircle, Upload } from 'lucide-react';

const CategoryIcons = {
    'PC': Monitor,
    'Laptop': Monitor,
    'Screen': Monitor,
    'Keyboard': Keyboard,
    'Mouse': Mouse,
    'Battery': Battery,
    'Charger': Battery,
    'Adapter': Cable,
    'Cables': Cable,
    'Phone': Smartphone
};

export default function Inventory() {
    const { t } = useLanguage();
    const { addXp } = useGamification() || { addXp: () => { } };
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [showAddModal, setShowAddModal] = useState(false);

    // Edit product modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);

    // Confirm modal and toast states
    const [confirmModal, setConfirmModal] = useState(null);
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // CSV Import modal state
    const [showCSVImport, setShowCSVImport] = useState(false);

    // Stock removal modal state
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [removeData, setRemoveData] = useState({ productId: null, productName: '', employeeId: '' });

    const [newProduct, setNewProduct] = useState({
        name: '',
        category_id: '',
        quantity: 0,
        min_quantity: 5,
        description: '',
        location: '',
        serial_number: '',
        asset_tag: '',
        condition: 'Bon',
        last_maintenance: '',
        next_maintenance: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, catRes, empRes] = await Promise.all([
                axios.get('/api/products'),
                axios.get('/api/categories'),
                axios.get('/api/employees')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setEmployees(empRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data", error);
            setLoading(false);
        }
    };

    const handleStockAdd = async (id) => {
        try {
            await axios.post(`/api/products/${id}/stock`, { change: 1 });
            setProducts(prev => prev.map(p =>
                p.id === id ? { ...p, quantity: p.quantity + 1 } : p
            ));
            addXp(5, 'Ajout de stock');
        } catch (error) {
            alert("Failed to update stock");
        }
    };

    const openRemoveModal = (product) => {
        setRemoveData({ productId: product.id, productName: product.name, reference: '' });
        setShowRemoveModal(true);
    };

    const handleStockRemove = async (e) => {
        e.preventDefault();
        try {
            // Use stock endpoint with reference (ticket + PRT)
            await axios.post(`/api/products/${removeData.productId}/stock`, {
                change: -1,
                recipient: removeData.reference
            });
            setProducts(prev => prev.map(p =>
                p.id === removeData.productId ? { ...p, quantity: p.quantity - 1 } : p
            ));
            setShowRemoveModal(false);
            setRemoveData({ productId: null, productName: '', reference: '' });
            addXp(3, 'Retrait de stock');
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update stock");
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/products', newProduct);
            setProducts([...products, {
                ...newProduct,
                id: res.data.id,
                category_id: Number(newProduct.category_id), // Ensure number type for filtering
                category_name: categories.find(c => c.id == newProduct.category_id)?.name
            }]);
            setShowAddModal(false);
            setNewProduct({ name: '', category_id: '', quantity: 0, min_quantity: 5, description: '', location: '', serial_number: '', asset_tag: '', condition: 'Bon', last_maintenance: '', next_maintenance: '' });
            addXp(10, 'Nouveau produit ajouté');
        } catch (error) {
            alert("Failed to add product");
        }
    };

    const handleDeleteProduct = (product) => {
        setConfirmModal({
            title: 'Supprimer le produit',
            message: `Êtes-vous sûr de vouloir supprimer "${product.name}" de l'inventaire ?`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.delete(`/api/products/${product.id}`);
                    setProducts(prev => prev.filter(p => p.id !== product.id));
                    addXp(2, 'Produit supprimé');
                    showToast('Produit supprimé', 'success');
                } catch (error) {
                    showToast(error.response?.data?.error || 'Erreur de suppression', 'error');
                }
            }
        });
    };

    const openEditModal = (product) => {
        setEditProduct({ ...product });
        setShowEditModal(true);
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/products/${editProduct.id}`, {
                name: editProduct.name,
                category_id: editProduct.category_id,
                quantity: editProduct.quantity,
                min_quantity: editProduct.min_quantity,
                description: editProduct.description,
                location: editProduct.location
            });
            setProducts(prev => prev.map(p =>
                p.id === editProduct.id
                    ? { ...editProduct, category_name: categories.find(c => c.id == editProduct.category_id)?.name }
                    : p
            ));
            setShowEditModal(false);
            setEditProduct(null);
            addXp(5, 'Produit modifié');
            showToast('Produit modifié', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || 'Erreur de modification', 'error');
        }
    };

    const handleDeleteFromEditModal = () => {
        if (!editProduct) return;
        setConfirmModal({
            title: 'Supprimer le produit',
            message: `Êtes-vous sûr de vouloir supprimer "${editProduct.name}" de l'inventaire ?`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.delete(`/api/products/${editProduct.id}`);
                    setProducts(prev => prev.filter(p => p.id !== editProduct.id));
                    setShowEditModal(false);
                    setEditProduct(null);
                    addXp(2, 'Produit supprimé');
                    showToast('Produit supprimé', 'success');
                } catch (error) {
                    showToast(error.response?.data?.error || 'Erreur de suppression', 'error');
                }
            }
        });
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryCount = (catId) => products.filter(p => p.category_id === catId).length;

    return (
        <div className="inventory-page">
            <TutorialButton tutorialKey="inventory" style={{ bottom: '2rem', right: '2rem' }} />
            <div className="page-header">
                <h1 className="page-title">{t('inventoryTitle')}</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="add-btn"
                        onClick={() => setShowCSVImport(true)}
                        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                    >
                        <Upload size={20} />
                        Import CSV
                    </button>
                    <button
                        className="add-btn btn-add-product"
                        id="tutorial-add-product-btn"
                        data-tutorial="add-product"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={20} />
                        {t('addItem')}
                    </button>
                </div>
            </div>

            <div className="inventory-layout">
                <div className="category-sidebar">
                    <h3 className="sidebar-title">{t('categories')}</h3>
                    <div className="category-list">
                        <button
                            className={`category-item ${selectedCategory === 'ALL' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('ALL')}
                        >
                            <div className="cat-info">
                                <Layers size={18} />
                                <span>{t('allItems')}</span>
                            </div>
                            <span className="count-badge">{products.length}</span>
                        </button>

                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                <div className="cat-info">
                                    <Box size={18} />
                                    <span>{t(`cat_${cat.name}`) || cat.name}</span>
                                </div>
                                <span className="count-badge">{getCategoryCount(cat.id)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="inventory-content">
                    <div className="search-bar">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder={t('searchInventory')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {loading ? <p>{t('loading')}</p> : (
                        <>
                            <h3 className="section-header">
                                {selectedCategory === 'ALL' ? t('allProducts') : categories.find(c => c.id === selectedCategory)?.name}
                                <span className="text-muted"> ({filteredProducts.length})</span>
                            </h3>

                            <div className="inventory-grid">
                                {filteredProducts.map(product => {
                                    const Icon = CategoryIcons[product.category_name] || Monitor;
                                    const isLow = product.quantity < product.min_quantity;

                                    return (
                                        <div key={product.id} className={`inventory-card ${isLow ? 'low-stock' : ''}`}>
                                            <div className="card-header">
                                                <div className="icon-wrapper">
                                                    <Icon size={24} />
                                                </div>
                                                <div className="stock-badges">
                                                    <span className="location-badge">{product.location || 'N/A'}</span>
                                                    {isLow && <span className="warning-badge"><AlertTriangle size={14} /> {t('lowStock')}</span>}
                                                </div>
                                            </div>

                                            <h3>{product.name}</h3>
                                            <p className="category">{t(`cat_${product.category_name}`) || product.category_name}</p>

                                            <div className="stock-control">
                                                <button onClick={() => openRemoveModal(product)} disabled={product.quantity <= 0} title="Retirer du stock">
                                                    <Minus size={16} />
                                                </button>
                                                <span className="quantity">{product.quantity}</span>
                                                <button onClick={() => handleStockAdd(product.id)} title="Ajouter au stock">
                                                    <Plus size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    style={{ marginLeft: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}
                                                    title="Modifier le produit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {filteredProducts.length === 0 && (
                                <div className="empty-state">
                                    <p>{t('noProducts')}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add Product Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title={t('addItem')}
                size="lg"
            >
                <form onSubmit={handleAddProduct} id="add-product-form" className="pro-form">
                    {/* 3 columns layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div className="form-group">
                            <label>{t('name')} <span className="required">*</span></label>
                            <input
                                required
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                placeholder={t('placeholderName')}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('category')}</label>
                            <select
                                required
                                value={newProduct.category_id}
                                onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}
                            >
                                <option value="">{t('selectCategory')}</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{t(`cat_${c.name}`) || c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t('location')}</label>
                            <input
                                value={newProduct.location}
                                onChange={e => setNewProduct({ ...newProduct, location: e.target.value })}
                                placeholder={t('placeholderLocation')}
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('quantity')}</label>
                            <div className="number-input-group">
                                <button type="button" onClick={() => setNewProduct({ ...newProduct, quantity: Math.max(0, newProduct.quantity - 1) })}>−</button>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={newProduct.quantity}
                                    onChange={e => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })}
                                />
                                <button type="button" onClick={() => setNewProduct({ ...newProduct, quantity: newProduct.quantity + 1 })}>+</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t('minQuantity')}</label>
                            <div className="number-input-group">
                                <button type="button" onClick={() => setNewProduct({ ...newProduct, min_quantity: Math.max(0, newProduct.min_quantity - 1) })}>−</button>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={newProduct.min_quantity}
                                    onChange={e => setNewProduct({ ...newProduct, min_quantity: parseInt(e.target.value) || 0 })}
                                />
                                <button type="button" onClick={() => setNewProduct({ ...newProduct, min_quantity: newProduct.min_quantity + 1 })}>+</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Asset Tag (PRT/STA)</label>
                            <input
                                value={newProduct.asset_tag}
                                onChange={e => setNewProduct({ ...newProduct, asset_tag: e.target.value })}
                                placeholder="Ex: PRT1425"
                            />
                        </div>

                        <div className="form-group">
                            <label>Numéro de série</label>
                            <input
                                value={newProduct.serial_number}
                                onChange={e => setNewProduct({ ...newProduct, serial_number: e.target.value })}
                                placeholder="Ex: SN123456789"
                            />
                        </div>
                        <div className="form-group">
                            <label>État</label>
                            <select
                                value={newProduct.condition}
                                onChange={e => setNewProduct({ ...newProduct, condition: e.target.value })}
                            >
                                <option value="Neuf">✨ Neuf</option>
                                <option value="Bon">✅ Bon</option>
                                <option value="Usé">⚠️ Usé</option>
                                <option value="Hors service">❌ Hors service</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Dernière maintenance</label>
                            <input
                                type="date"
                                value={newProduct.last_maintenance}
                                onChange={e => setNewProduct({ ...newProduct, last_maintenance: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Prochaine maintenance</label>
                            <input
                                type="date"
                                value={newProduct.next_maintenance}
                                onChange={e => setNewProduct({ ...newProduct, next_maintenance: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>{t('description')}</label>
                        <textarea
                            value={newProduct.description}
                            onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                            placeholder={t('placeholderDescription')}
                            rows={2}
                        />
                    </div>
                </form>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">
                        {t('cancel')}
                    </button>
                    <button type="submit" form="add-product-form" className="submit-btn pro-submit">
                        <Plus size={18} />
                        {t('addItem')}
                    </button>
                </div>
            </Modal>

            {/* Stock Removal Modal - Reference Field */}
            <Modal
                isOpen={showRemoveModal}
                onClose={() => setShowRemoveModal(false)}
                title={t('removeStock')}
                size="sm"
            >
                <div>
                    <p className="modal-subtitle" style={{ marginBottom: '1rem' }}>{removeData.productName}</p>
                    <form onSubmit={handleStockRemove} id="remove-stock-form" className="pro-form">
                        <div className="form-group">
                            <label>{t('reference')}</label>
                            <div className="input-affix-wrapper">
                                <input
                                    required
                                    value={removeData.reference || ''}
                                    onChange={e => setRemoveData({ ...removeData, reference: e.target.value })}
                                    placeholder={t('placeholderReference')}
                                    autoFocus
                                />
                            </div>
                            <p className="form-hint" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                {t('referenceHint')}
                            </p>
                        </div>
                    </form>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={() => setShowRemoveModal(false)} className="cancel-btn">
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            form="remove-stock-form"
                            className="submit-btn pro-submit"
                            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: 'none', color: 'white' }}
                        >
                            <Minus size={18} />
                            {t('confirmRemove')}
                        </button>
                    </div>
                </div>
            </Modal >

            {/* Edit Product Modal */}
            < Modal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditProduct(null); }}
                title={t('editProduct')}
                size="md"
            >
                {editProduct && (
                    <form onSubmit={handleEditProduct} id="edit-product-form" className="pro-form">
                        <div className="form-group">
                            <label>{t('name')} <span className="required">*</span></label>
                            <div className="input-affix-wrapper">
                                <Package size={16} className="input-icon-left" />
                                <input
                                    required
                                    value={editProduct.name}
                                    onChange={e => setEditProduct({ ...editProduct, name: e.target.value })}
                                    placeholder={t('placeholderName')}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('category')}</label>
                                <div className="input-affix-wrapper">
                                    <Layers size={16} className="input-icon-left" />
                                    <select
                                        required
                                        value={editProduct.category_id}
                                        onChange={e => setEditProduct({ ...editProduct, category_id: e.target.value })}
                                    >
                                        <option value="">{t('selectCategory')}</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{t(`cat_${c.name}`) || c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('quantity')}</label>
                                <div className="number-input-group">
                                    <button type="button" onClick={() => setEditProduct({ ...editProduct, quantity: Math.max(0, editProduct.quantity - 1) })}>−</button>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={editProduct.quantity}
                                        onChange={e => setEditProduct({ ...editProduct, quantity: parseInt(e.target.value) || 0 })}
                                    />
                                    <button type="button" onClick={() => setEditProduct({ ...editProduct, quantity: editProduct.quantity + 1 })}>+</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('minQuantity')}</label>
                                <div className="number-input-group">
                                    <button type="button" onClick={() => setEditProduct({ ...editProduct, min_quantity: Math.max(0, editProduct.min_quantity - 1) })}>−</button>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={editProduct.min_quantity}
                                        onChange={e => setEditProduct({ ...editProduct, min_quantity: parseInt(e.target.value) || 0 })}
                                    />
                                    <button type="button" onClick={() => setEditProduct({ ...editProduct, min_quantity: editProduct.min_quantity + 1 })}>+</button>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('location')}</label>
                            <div className="input-affix-wrapper">
                                <Monitor size={16} className="input-icon-left" />
                                <input
                                    value={editProduct.location || ''}
                                    onChange={e => setEditProduct({ ...editProduct, location: e.target.value })}
                                    placeholder={t('placeholderLocation')}
                                />
                            </div>
                        </div>

                        {/* NEW FIELDS - Identification */}
                        <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', paddingTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--primary-color)', marginBottom: '0.75rem' }}>📦 Identification</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Numéro de série</label>
                                    <input
                                        value={editProduct.serial_number || ''}
                                        onChange={e => setEditProduct({ ...editProduct, serial_number: e.target.value })}
                                        placeholder="Ex: SN123456789"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Asset Tag (PRT/STA)</label>
                                    <input
                                        value={editProduct.asset_tag || ''}
                                        onChange={e => setEditProduct({ ...editProduct, asset_tag: e.target.value })}
                                        placeholder="Ex: PRT1425 ou STA5678"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* NEW FIELDS - État & Maintenance */}
                        <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', paddingTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--primary-color)', marginBottom: '0.75rem' }}>🔧 État & Maintenance</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>État</label>
                                    <select
                                        value={editProduct.condition || 'Bon'}
                                        onChange={e => setEditProduct({ ...editProduct, condition: e.target.value })}
                                    >
                                        <option value="Neuf">✨ Neuf</option>
                                        <option value="Bon">✅ Bon</option>
                                        <option value="Usé">⚠️ Usé</option>
                                        <option value="Hors service">❌ Hors service</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Dernière maintenance</label>
                                    <input
                                        type="date"
                                        value={editProduct.last_maintenance ? editProduct.last_maintenance.split('T')[0] : ''}
                                        onChange={e => setEditProduct({ ...editProduct, last_maintenance: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Prochaine maintenance</label>
                                    <input
                                        type="date"
                                        value={editProduct.next_maintenance ? editProduct.next_maintenance.split('T')[0] : ''}
                                        onChange={e => setEditProduct({ ...editProduct, next_maintenance: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('description')}</label>
                            <textarea
                                value={editProduct.description || ''}
                                onChange={e => setEditProduct({ ...editProduct, description: e.target.value })}
                                placeholder={t('placeholderDescription')}
                                rows={3}
                            />
                        </div>
                    </form>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={handleDeleteFromEditModal}
                        className="cancel-btn"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Trash2 size={16} />
                        {t('deleteProduct')}
                    </button>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={() => { setShowEditModal(false); setEditProduct(null); }} className="cancel-btn">
                            {t('cancel')}
                        </button>
                        <button type="submit" form="edit-product-form" className="submit-btn pro-submit">
                            {t('saveChanges')}
                        </button>
                    </div>
                </div>
            </Modal >

            {/* Generic Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={confirmModal?.onConfirm}
                title={confirmModal?.title || 'Confirmation'}
                message={confirmModal?.message || ''}
                confirmText={confirmModal?.confirmText || 'Confirmer'}
                cancelText={confirmModal?.cancelText || 'Annuler'}
                type={confirmModal?.type || 'warning'}
                isDangerous={confirmModal?.type === 'danger'}
            />

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    background: toast.type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                        toast.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    animation: 'slideUp 0.3s ease',
                    zIndex: 10000,
                    fontWeight: 500
                }}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> :
                        toast.type === 'error' ? <AlertTriangle size={20} /> :
                            <CheckCircle size={20} />}
                    {toast.message}
                </div>
            )}

            {/* CSV Import Modal */}
            <CSVImportModal
                isOpen={showCSVImport}
                onClose={() => setShowCSVImport(false)}
                onImport={async (rows) => {
                    const res = await axios.post('/api/products/import', { data: rows });
                    await fetchData();
                    showToast(`${res.data.imported} produits importés !`, 'success');
                }}
                entityType="products"
                requiredColumns={['name', 'category', 'quantity', 'location']}
                sampleData="Souris USB,Peripheral,50,Armoire A"
            />
        </div >
    );
}
