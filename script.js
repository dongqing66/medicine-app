// 药品数据存储
let medicines = JSON.parse(localStorage.getItem('medicines')) || [];
let currentFilter = 'all';
let currentView = 'grid';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// 初始化应用
function initializeApp() {
    updateStats();
    displayMedicines();
    showAlerts();
    updateNavStats();
}

// 设置事件监听器
function setupEventListeners() {
    // 表单提交
    document.getElementById('medicineForm').addEventListener('submit', addMedicine);
    
    // 搜索功能
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // 筛选按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            displayMedicines();
        });
    });
    
    // 视图切换
    document.getElementById('gridView').addEventListener('click', () => switchView('grid'));
    document.getElementById('listView').addEventListener('click', () => switchView('list'));
    
    // 表单折叠
    document.getElementById('toggleForm').addEventListener('click', toggleForm);
    
    // 弹窗关闭
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // 点击弹窗外部关闭
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}

// 添加药品功能（增强版）
function addMedicine(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const imageFile = document.getElementById('image').files[0];
    
    const medicine = {
        id: Date.now(),
        name: formData.get('name') || document.getElementById('name').value,
        brand: formData.get('brand') || document.getElementById('brand').value || '未知品牌',
        stock: parseInt(document.getElementById('stock').value),
        expiry: document.getElementById('expiry').value,
        opened: document.getElementById('opened').value || null,
        image: null,
        addedDate: new Date().toISOString().split('T')[0]
    };
    
    // 处理图片上传
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            medicine.image = e.target.result;
            saveMedicine(medicine);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveMedicine(medicine);
    }
}

// 保存药品
function saveMedicine(medicine) {
    medicines.push(medicine);
    localStorage.setItem('medicines', JSON.stringify(medicines));
    
    // 重置表单
    document.getElementById('medicineForm').reset();
    
    // 更新显示
    initializeApp();
    
    // 显示成功提示
    showNotification('药品添加成功！', 'success');
}

// 显示药品列表（增强版）
function displayMedicines() {
    const container = document.getElementById('medicineContainer');
    let filteredMedicines = filterMedicines();
    
    if (filteredMedicines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-pills"></i>
                <h3>暂无药品</h3>
                <p>开始添加您的第一个药品吧！</p>
            </div>
        `;
        return;
    }
    
    container.className = `medicine-${currentView}`;
    
    let html = '';
    filteredMedicines.forEach(medicine => {
        const expiryInfo = getExpiryInfo(medicine);
        
        html += `
            <div class="medicine-item ${expiryInfo.statusClass}" data-id="${medicine.id}">
                <div class="medicine-image-container">
                    <img class="medicine-image" 
                         src="${medicine.image || getDefaultImage()}" 
                         alt="${medicine.name}"
                         onerror="this.src='${getDefaultImage()}'">
                </div>
                <div class="medicine-content">
                    <div class="medicine-header">
                        <div>
                            <div class="medicine-title">${medicine.name}</div>
                            <div class="medicine-brand">${medicine.brand}</div>
                        </div>
                        <span class="medicine-status status-${expiryInfo.status}">
                            ${expiryInfo.statusText}
                        </span>
                    </div>
                    
                    <div class="medicine-details">
                        <div class="detail-item">
                            <span class="detail-value">${medicine.stock}</span>
                            <span class="detail-label">库存</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-value">${expiryInfo.daysRemaining}</span>
                            <span class="detail-label">剩余天数</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-value">${formatDate(medicine.expiry)}</span>
                            <span class="detail-label">过期时间</span>
                        </div>
                        ${medicine.opened ? `
                            <div class="detail-item">
                                <span class="detail-value">${formatDate(medicine.opened)}</span>
                                <span class="detail-label">开封时间</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="medicine-actions">
                        <button class="btn btn-primary btn-small" onclick="editMedicine(${medicine.id})">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn btn-success btn-small" onclick="useMedicine(${medicine.id})">
                            <i class="fas fa-minus"></i> 使用
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteMedicine(${medicine.id})">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 获取过期信息
function getExpiryInfo(medicine) {
    const today = new Date();
    const expiryDate = new Date(medicine.expiry);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status, statusText, statusClass;
    
    if (diffDays < 0) {
        status = 'expired';
        statusText = `已过期 ${Math.abs(diffDays)} 天`;
        statusClass = 'expired';
    } else if (diffDays <= 7) {
        status = 'expiring';
        statusText = `${diffDays} 天后过期`;
        statusClass = 'expiring-soon';
    } else if (diffDays <= 30) {
        status = 'expiring';
        statusText = `${diffDays} 天后过期`;
        statusClass = 'expiring-soon';
    } else {
        status = 'healthy';
        statusText = '状态良好';
        statusClass = 'healthy';
    }
    
    return {
        status,
        statusText,
        statusClass,
        daysRemaining: diffDays < 0 ? 0 : diffDays
    };
}

// 更新统计数据
function updateStats() {
    const stats = {
        total: medicines.length,
        expired: 0,
        expiringSoon: 0,
        healthy: 0
    };
    
    medicines.forEach(medicine => {
        const expiryInfo = getExpiryInfo(medicine);
        if (expiryInfo.status === 'expired') {
            stats.expired++;
        } else if (expiryInfo.status === 'expiring') {
            stats.expiringSoon++;
        } else {
            stats.healthy++;
        }
    });
    
    document.getElementById('totalMedicines').textContent = stats.total;
    document.getElementById('expiringSoon').textContent = stats.expiringSoon;
    document.getElementById('expired').textContent = stats.expired;
    document.getElementById('healthy').textContent = stats.healthy;
}

// 更新导航统计
function updateNavStats() {
    const totalCount = medicines.length;
    const warningCount = medicines.filter(m => {
        const expiryInfo = getExpiryInfo(m);
        return expiryInfo.status === 'expired' || expiryInfo.status === 'expiring';
    }).length;
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('warningCount').textContent = warningCount;
}

// 显示警告提醒
function showAlerts() {
    const alertsContainer = document.getElementById('alertsContainer');
    const expiredMedicines = medicines.filter(m => getExpiryInfo(m).status === 'expired');
    const expiringMedicines = medicines.filter(m => {
        const info = getExpiryInfo(m);
        return info.status === 'expiring' && info.daysRemaining <= 7;
    });
    
    let html = '';
    
    if (expiredMedicines.length > 0) {
        html += `
            <div class="alert danger">
                <i class="fas fa-times-circle"></i>
                <div>
                    <strong>已过期提醒：</strong>
                    有 ${expiredMedicines.length} 种药品已过期，请及时处理！
                </div>
            </div>
        `;
    }
    
    if (expiringMedicines.length > 0) {
        html += `
            <div class="alert warning">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>即将过期提醒：</strong>
                    有 ${expiringMedicines.length} 种药品将在7天内过期！
                </div>
            </div>
        `;
    }
    
    alertsContainer.innerHTML = html;
}

// 筛选药品
function filterMedicines() {
    let filtered = medicines;
    
    // 按状态筛选
    if (currentFilter !== 'all') {
        filtered = filtered.filter(medicine => {
            const expiryInfo = getExpiryInfo(medicine);
            switch (currentFilter) {
                case 'expired':
                    return expiryInfo.status === 'expired';
                case 'expiring':
                    return expiryInfo.status === 'expiring';
                case 'healthy':
                    return expiryInfo.status === 'healthy';
                default:
                    return true;
            }
        });
    }
    
    // 按搜索关键词筛选
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(medicine => 
            medicine.name.toLowerCase().includes(searchTerm) ||
            medicine.brand.toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

// 搜索处理
function handleSearch() {
    displayMedicines();
}

// 切换视图
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(view + 'View').classList.add('active');
    displayMedicines();
}

// 编辑药品
function editMedicine(id) {
    const medicine = medicines.find(m => m.id === id);
    if (!medicine) return;
    
    document.getElementById('editId').value = id;
    document.getElementById('editStock').value = medicine.stock;
    document.getElementById('editOpened').value = medicine.opened || '';
    
    document.getElementById('editModal').style.display = 'block';
}

// 保存编辑
function saveEdit() {
    const id = parseInt(document.getElementById('editId').value);
    const medicine = medicines.find(m => m.id === id);
    
    if (medicine) {
        medicine.stock = parseInt(document.getElementById('editStock').value);
        medicine.opened = document.getElementById('editOpened').value || null;
        
        localStorage.setItem('medicines', JSON.stringify(medicines));
        initializeApp();
        closeModal();
        showNotification('修改成功！', 'success');
    }
}

// 使用药品
function useMedicine(id) {
    const medicine = medicines.find(m => m.id === id);
    if (!medicine) return;
    
    if (medicine.stock <= 0) {
        showNotification('库存不足！', 'warning');
        return;
    }
    
    medicine.stock--;
    localStorage.setItem('medicines', JSON.stringify(medicines));
    initializeApp();
    showNotification(`${medicine.name} 使用成功，剩余 ${medicine.stock} 个`, 'success');
}

// 删除药品
function deleteMedicine(id) {
    const medicine = medicines.find(m => m.id === id);
    if (!medicine) return;
    
    if (confirm(`确定要删除 "${medicine.name}" 吗？此操作不可撤销！`)) {
        medicines = medicines.filter(m => m.id !== id);
        localStorage.setItem('medicines', JSON.stringify(medicines));
        initializeApp();
        showNotification('删除成功！', 'success');
    }
}

// 关闭弹窗
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// 折叠表单
function toggleForm() {
    const formBody = document.getElementById('addForm');
    const toggleBtn = document.getElementById('toggleForm');
    
    formBody.classList.toggle('collapsed');
    toggleBtn.classList.toggle('rotated');
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

// 获取默认图片
function getDefaultImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzY2N0VFQSIvPgo8cGF0aCBkPSJNODUgMTAwSDE1NUMxNjAuNTIzIDEwMCAxNjUgMTA0LjQ3NyAxNjUgMTEwVjE0MEMxNjUgMTQ1LjUyMyAxNjAuNTIzIDE1MCAxNTUgMTUwSDQ1QzM5LjQ3NzIgMTUwIDM1IDE0NS41MjMgMzUgMTQwVjExMEMzNSAxMDQuNDc3IDM5LjQ3NzIgMTAwIDQ1IDEwMEg4NVoiIGZpbGw9IiM2NjdFRUEiLz4KPHRleHQgeD0iMTAwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+6I2v5ZOB5Zu+54mHPC90ZXh0Pgo8L3N2Zz4=';
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 250px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    // 设置背景色
    const colors = {
        success: '#48bb78',
        warning: '#ed8936',
        error: '#f56565',
        info: '#4299e1'
    };
    notification.style.background = colors[type] || colors.info;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 获取通知图标
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        warning: 'exclamation-triangle',
        error: 'times-circle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
