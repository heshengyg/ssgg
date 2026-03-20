// main.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ main.js loaded');

    // 左侧菜单切换
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const targetId = this.getAttribute('data-target');
            menuItems.forEach(m => m.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });

// 加载平台简介内容
fetch('data/intro.json')
    .then(res => {
        if (!res.ok) throw new Error('网络响应失败');
        return res.json();
    })
    .then(contentBlocks => {
        const introContentDiv = document.getElementById('intro-content');
        if (!introContentDiv) return;
        introContentDiv.innerHTML = ''; // 清空
        contentBlocks.forEach(block => {
            if (block.type === 'text') {
                const p = document.createElement('p');
                p.textContent = block.content;
                introContentDiv.appendChild(p);
            } else if (block.type === 'image') {
                const img = document.createElement('img');
                img.src = block.src;
                img.alt = block.alt || '';
                // 可以设置样式，或者添加类名
                if (block.style) {
                    img.style.cssText = block.style;
                } else {
                    img.style.maxWidth = '100%';
                    img.style.margin = '10px 0';
                }
                introContentDiv.appendChild(img);
            }
            // 可以扩展其他类型，如标题等
        });
    })
    .catch(err => {
        console.error('平台简介加载失败：', err);
        document.getElementById('intro-content').innerHTML = '<p style="color:red;">简介暂时无法加载，请稍后查看。</p>';
    });

// ---------- 加载平台要闻（支持图文混排）----------
fetch('data/news.json')
    .then(res => res.json())
    .then(newsArray => {
        const newsListDiv = document.getElementById('news-list');
        if (!newsListDiv) return;
        newsListDiv.innerHTML = ''; // 清空

        newsArray.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-item';

            // 标题和时间（始终可见）
            const headerDiv = document.createElement('div');
            headerDiv.className = 'news-header';
            headerDiv.innerHTML = `<h3>${item.title}</h3><div class="news-time">📆 ${item.time}</div>`;

            // 正文容器（初始隐藏）
            const contentDiv = document.createElement('div');
            contentDiv.className = 'news-content';
            contentDiv.style.display = 'none'; // 默认隐藏

            // 根据 content 数组生成正文内容
            if (Array.isArray(item.content)) {
                item.content.forEach(block => {
                    if (block.type === 'text') {
                        const p = document.createElement('p');
                        p.textContent = block.value;
                        contentDiv.appendChild(p);
                    } else if (block.type === 'image') {
                        const img = document.createElement('img');
                        img.src = block.src;
                        img.alt = block.alt || '';
                        // 可以添加样式类或内联样式
                        img.style.maxWidth = '100%';
                        img.style.margin = '10px 0';
                        contentDiv.appendChild(img);
                    }
                });
            } else {
                // 兼容旧格式（如果 content 是纯字符串）
                const p = document.createElement('p');
                p.textContent = item.content;
                contentDiv.appendChild(p);
            }

            // 组装文章
            article.appendChild(headerDiv);
            article.appendChild(contentDiv);

            // 点击标题切换正文显示
            headerDiv.addEventListener('click', () => {
                contentDiv.style.display = contentDiv.style.display === 'none' ? 'block' : 'none';
            });

            newsListDiv.appendChild(article);
        });
    })
    .catch(err => {
        console.warn('新闻加载失败', err);
        document.getElementById('news-list').innerHTML = '<p style="color:red;">要闻暂时无法加载，请稍后查看。</p>';
    });

    // 加载省市区数据
    fetch('data/areas_nested.json')
        .then(res => {
            if (!res.ok) throw new Error('网络响应失败');
            return res.json();
        })
        .then(areaData => {
            console.log('省市区数据加载成功', areaData);
            function initProvince(provSelectId, citySelectId, distSelectId) {
                const provSelect = document.getElementById(provSelectId);
                const citySelect = document.getElementById(citySelectId);
                const distSelect = document.getElementById(distSelectId);
                if (!provSelect) return;

                provSelect.innerHTML = '<option value="">请选择省</option>';
                areaData.forEach(p => {
                    provSelect.add(new Option(p.name, p.code));
                });

                provSelect.addEventListener('change', function() {
                    const selectedProvCode = this.value;
                    const prov = areaData.find(p => p.code == selectedProvCode);
                    citySelect.innerHTML = '<option value="">请选择市</option>';
                    distSelect.innerHTML = '<option value="">请选择区/县</option>';
                    if (prov && prov.children && prov.children.length > 0) {
                        prov.children.forEach(c => {
                            citySelect.add(new Option(c.name, c.code));
                        });
                    }
                });

                citySelect.addEventListener('change', function() {
                    const selectedCityCode = this.value;
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

            initProvince('supplierProvince', 'supplierCity', 'supplierDistrict');
            initProvince('merchantProvince', 'merchantCity', 'merchantDistrict');
        })
        .catch(err => {
            console.error('省市区数据加载失败：', err);
            document.querySelectorAll('.address-group select').forEach(sel => {
                sel.innerHTML = '<option value="">加载失败</option>';
            });
        });

    // 地图选点按钮
    document.querySelectorAll('.map-pick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const formId = this.getAttribute('data-form');
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

// 改为相对路径。因为我们的 Functions 文件是 submit.js，它对应的路由就是 /submit
const API_ENDPOINT = '/submit';

    async function submitForm(formId, type) {
        const form = document.getElementById(formId);
        if (!form) return;

        // 获取表单数据
        const shopName = form.querySelector('input[name="shopName"]').value.trim();
        const contactPhone = form.querySelector('input[name="contactPhone"]').value.trim();
        const contactName = form.querySelector('input[name="contactName"]').value.trim();
        const detailAddress = form.querySelector('input[name="detailAddress"]').value.trim();

        const provSelect = form.querySelector('select[name="province"]');
        const citySelect = form.querySelector('select[name="city"]');
        const distSelect = form.querySelector('select[name="district"]');
        const province = provSelect.options[provSelect.selectedIndex]?.text || '';
        const city = citySelect.options[citySelect.selectedIndex]?.text || '';
        const district = distSelect.options[distSelect.selectedIndex]?.text || '';

        // 验证必填字段
        if (!shopName || !contactName || !contactPhone || !province || !city || !district || !detailAddress) {
            alert('请填写所有必填字段');
            return false;
        }

        const payload = {
            type: type,
            shopName: shopName,
            contactName: contactName,
            contactPhone: contactPhone,
            province: province,
            city: city,
            district: district,
            detailAddress: detailAddress,
            timestamp: new Date().toISOString()
        };

        try {
            // 显示提交中状态
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '提交中...';
            submitBtn.disabled = true;

            // 原来是
// const response = await fetch(WORKER_URL, { ... });

// 改为
const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
});

            const result = await response.json();
            if (result.code === 0) {
                alert(`${type}入驻申请提交成功！`);
                form.reset(); // 清空表单
            } else {
                throw new Error(result.message || '提交失败');
            }
        } catch (error) {
            console.error('提交失败：', error);
            alert('提交失败，请稍后重试或联系管理员');
        } finally {
            // 恢复按钮状态
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = '提交入驻申请';
            submitBtn.disabled = false;
        }
    }

    // 绑定供应商表单提交
    document.getElementById('supplierForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        submitForm('supplierForm', '供应商');
    });

    // 绑定商家表单提交
    document.getElementById('merchantForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        submitForm('merchantForm', '商家');
    });
});

// ---------- 二维码点击放大和保存 ----------
// 创建模态框元素（如果尚未存在）
function createQrcodeModal() {
    if (document.getElementById('qrcodeModal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'qrcodeModal';
    modalDiv.className = 'qrcode-modal';
    modalDiv.innerHTML = `
        <span class="qrcode-modal-close">&times;</span>
        <div class="qrcode-modal-content">
            <img id="qrcodeModalImg" src="" alt="二维码">
        </div>
        <div class="download-tip">长按图片即可保存到手机</div>
    `;
    document.body.appendChild(modalDiv);

    // 关闭模态框
    const closeBtn = modalDiv.querySelector('.qrcode-modal-close');
    closeBtn.addEventListener('click', () => {
        modalDiv.style.display = 'none';
    });
    modalDiv.addEventListener('click', (e) => {
        if (e.target === modalDiv) modalDiv.style.display = 'none';
    });
}

// 绑定二维码点击事件
function bindQrcodeClick() {
    const qrcodeImgs = document.querySelectorAll('.qrcode-img');
    if (qrcodeImgs.length === 0) return;

    createQrcodeModal();

    qrcodeImgs.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const modalImg = document.getElementById('qrcodeModalImg');
            modalImg.src = img.src;
            modalImg.alt = img.alt;
            document.getElementById('qrcodeModal').style.display = 'flex';
        });
    });
}

// 在页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // ... 其他已有代码 ...
    bindQrcodeClick();
});