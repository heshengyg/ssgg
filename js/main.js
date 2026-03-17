// main.js

document.addEventListener('DOMContentLoaded', function() {
    // ---------- 左侧菜单切换 ----------
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const targetId = this.getAttribute('data-target');
            // 移除所有active
            menuItems.forEach(m => m.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            // 激活当前
            this.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // ---------- 加载平台要闻 (来自 news.json) ----------
// ---------- 加载平台要闻 (来自 news.json) ----------
fetch('data/news.json')
    .then(res => res.json())
    .then(newsArray => {
        const newsListDiv = document.getElementById('news-list');
        if (!newsListDiv) return;
        newsListDiv.innerHTML = '';
        newsArray.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-item';
            article.innerHTML = `
                <div class="news-header" style="cursor: pointer;">
                    <h3>${item.title}</h3>
                    <div class="news-time">📅 ${item.time}</div>
                </div>
                <div class="news-content" style="display: none; margin-top: 12px;">${item.content}</div>
            `;
            const header = article.querySelector('.news-header');
            const content = article.querySelector('.news-content');
            header.addEventListener('click', () => {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            });
            newsListDiv.appendChild(article);
        });
    })
    .catch(err => {
        console.warn('新闻加载失败', err);
        document.getElementById('news-list').innerHTML = '<p style="color:red;">要闻暂时无法加载，请稍后查看。</p>';
    });
// ---------- 加载省市区数据 (areas_nested.json) 并生成下拉框 ----------
fetch('data/areas_nested.json')
    .then(res => {
        if (!res.ok) throw new Error('网络响应失败');
        return res.json();
    })
    .then(areaData => {
        console.log('省市区数据加载成功', areaData); // 调试用，可删除
        // 生成省下拉框
        function initProvince(provSelectId, citySelectId, distSelectId) {
            const provSelect = document.getElementById(provSelectId);
            const citySelect = document.getElementById(citySelectId);
            const distSelect = document.getElementById(distSelectId);
            if (!provSelect) return;

            // 填充省
            provSelect.innerHTML = '<option value="">请选择省</option>';
            areaData.forEach(p => {
                provSelect.add(new Option(p.name, p.code));
            });

            // 省改变时加载城市
            provSelect.addEventListener('change', function() {
                const selectedProvCode = this.value;
                const prov = areaData.find(p => p.code == selectedProvCode);
                citySelect.innerHTML = '<option value="">请选择市</option>';
                distSelect.innerHTML = '<option value="">请选择区/县</option>';
                if (prov && prov.children && prov.children.length > 0) {
                    prov.children.forEach(c => {
                        citySelect.add(new Option(c.name, c.code));
                    });
                } else {
                    console.warn('该省无下级城市', prov);
                }
            });

            // 市改变时加载区县
            citySelect.addEventListener('change', function() {
                const selectedCityCode = this.value;
                // 找到当前省
                const provCode = provSelect.value;
                const prov = areaData.find(p => p.code == provCode);
                if (!prov || !prov.children) return;
                const city = prov.children.find(c => c.code == selectedCityCode);
                distSelect.innerHTML = '<option value="">请选择区/县</option>';
                if (city && city.children && city.children.length > 0) {
                    city.children.forEach(d => {
                        distSelect.add(new Option(d.name, d.code));
                    });
                }
            });
        }

        // 分别初始化供应商和商家的省市区
        initProvince('supplierProvince', 'supplierCity', 'supplierDistrict');
        initProvince('merchantProvince', 'merchantCity', 'merchantDistrict');
    })
    .catch(err => {
        console.error('省市区数据加载失败：', err);
        // 可以显示友好提示，但这里不阻塞其他功能
        document.querySelectorAll('.address-group select').forEach(sel => {
            sel.innerHTML = '<option value="">加载失败</option>';
        });
    });

    // ---------- 地图选点按钮 ----------
    document.querySelectorAll('.map-pick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const formId = this.getAttribute('data-form'); // 'supplier' 或 'merchant'
            // 显示弹窗
            window.openMapPicker(formId);
        });
    });

    // 关闭地图弹窗
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('mapModal').style.display = 'none';
    });
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('mapModal');
        if (e.target === modal) modal.style.display = 'none';
    });

    // 地图加载完成后绑定点击事件
    
    // ---------- 表单提交演示（实际可改为AJAX）----------
    document.getElementById('supplierForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('供应商入驻申请已提交（演示模式）');
        // 此处可收集表单数据发送到后端
    });
    document.getElementById('merchantForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('商家入驻申请已提交（演示模式）');
    });
});