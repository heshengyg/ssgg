// main.js - 完整稳定版（切换页面时自动暂停视频）
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ main.js loaded');

    // ---------- 左侧菜单切换（自动暂停视频） ----------
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const targetId = this.getAttribute('data-target');
            const currentPage = document.querySelector('.page.active');
            const targetPage = document.getElementById(targetId);

            // 如果目标页面与当前页面不同，则暂停当前页面中的所有视频
            if (currentPage && currentPage !== targetPage) {
                const videos = currentPage.querySelectorAll('video');
                videos.forEach(video => {
                    video.pause();
                });
            }

            // 切换菜单和页面
            menuItems.forEach(m => m.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            targetPage.classList.add('active');
        });
    });

    // ---------- 加载平台简介（支持图文、视频）----------
    fetch('data/intro.json')
        .then(res => {
            if (!res.ok) throw new Error('网络响应失败');
            return res.json();
        })
        .then(contentBlocks => {
            const introContentDiv = document.getElementById('intro-content');
            if (!introContentDiv) return;
            introContentDiv.innerHTML = '';
            contentBlocks.forEach(block => {
if (block.type === 'text') {
    const p = document.createElement('p');
    p.innerHTML = block.content;
    // 根据 indent 属性添加不同的类
    if (block.indent === true) {
        p.classList.add('indent-paragraph');
    } else {
        p.classList.add('no-indent-paragraph');
    }
    introContentDiv.appendChild(p);
} else if (block.type === 'image') {
                    const img = document.createElement('img');
                    img.src = block.src;
                    img.alt = block.alt || '';
                    img.style.maxWidth = '100%';
                    img.style.margin = '10px 0';
                    introContentDiv.appendChild(img);
                } else if (block.type === 'video') {
                    const video = document.createElement('video');
                    video.src = block.src;
                    if (block.poster) video.poster = block.poster;
                    video.controls = true;
                    video.autoplay = true;
                    video.muted = true;
                    video.loop = true;
                    video.style.maxWidth = '100%';
                    video.style.margin = '10px 0';
                    video.style.borderRadius = '8px';
                    video.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    introContentDiv.appendChild(video);
                }
            });
        })
        .catch(err => {
            console.error('平台简介加载失败：', err);
            document.getElementById('intro-content').innerHTML = '<p style="color:red;">简介暂时无法加载，请稍后查看。</p>';
        });

// ---------- 加载平台要闻（支持图文混排，自动暂停视频）----------
fetch('data/news.json')
    .then(res => res.json())
    .then(newsArray => {
        const newsListDiv = document.getElementById('news-list');
        if (!newsListDiv) return;
        newsListDiv.innerHTML = '';

        // 辅助函数：暂停所有新闻正文中的视频
        function pauseAllNewsVideos() {
            const allVideos = document.querySelectorAll('.news-content video');
            allVideos.forEach(video => {
                if (!video.paused) video.pause();
            });
        }

        newsArray.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-item';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'news-header';
            headerDiv.innerHTML = `<h3>${item.title}</h3><div class="news-time">📆 ${item.time}</div>`;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'news-content';
            contentDiv.style.display = 'none';

            if (Array.isArray(item.content)) {
                item.content.forEach(block => {
                    if (block.type === 'text') {
                        const p = document.createElement('p');
                        p.innerHTML = block.value;  // 使用 innerHTML 支持加粗等标签
                        // 根据 indent 字段添加缩进类（可选）
                        if (block.indent === true) {
                            p.classList.add('indent-paragraph');
                        } else {
                            p.classList.add('no-indent-paragraph');
                        }
                        contentDiv.appendChild(p);
                    } else if (block.type === 'image') {
                        const img = document.createElement('img');
                        img.src = block.src;
                        img.alt = block.alt || '';
                        img.style.maxWidth = '100%';
                        img.style.margin = '10px 0';
                        contentDiv.appendChild(img);
                    } else if (block.type === 'video') {
                        const video = document.createElement('video');
                        video.src = block.src;
                        if (block.poster) video.poster = block.poster;
                        video.controls = true;
                        video.autoplay = true;
                        video.muted = true;
                        video.loop = true;
                        video.style.maxWidth = '100%';
                        video.style.margin = '10px 0';
                        video.style.borderRadius = '8px';
                        video.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        contentDiv.appendChild(video);
                    }
                });
            } else {
                const p = document.createElement('p');
                p.textContent = item.content;
                contentDiv.appendChild(p);
            }

            article.appendChild(headerDiv);
            article.appendChild(contentDiv);

            // 点击标题时，先暂停所有视频，再切换当前正文的显示
            headerDiv.addEventListener('click', () => {
                // 暂停所有其他视频
                pauseAllNewsVideos();
                // 切换当前正文显示状态
                if (contentDiv.style.display === 'none') {
                    contentDiv.style.display = 'block';
                } else {
                    contentDiv.style.display = 'none';
                    // 如果当前正文中有视频，也暂停它们
                    const videosInCurrent = contentDiv.querySelectorAll('video');
                    videosInCurrent.forEach(v => v.pause());
                }
            });

            newsListDiv.appendChild(article);
        });
    })
    .catch(err => {
        console.warn('新闻加载失败', err);
        document.getElementById('news-list').innerHTML = '<p style="color:red;">要闻暂时无法加载，请稍后查看。</p>';
    });

    // ---------- 加载省市区数据 ----------
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

    // ---------- 地图选点按钮 ----------
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

    // ---------- 表单提交到 Cloudflare Functions ----------
    const API_ENDPOINT = '/submit';

    async function submitForm(formId, type) {
        const form = document.getElementById(formId);
        if (!form) return;

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
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = '提交中...';
            submitBtn.disabled = true;

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.code === 0) {
                alert(`${type}入驻申请提交成功！`);
                form.reset();
            } else {
                throw new Error(result.message || '提交失败');
            }
        } catch (error) {
            console.error('提交失败：', error);
            alert('提交失败，请稍后重试或联系管理员');
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = '提交入驻申请';
            submitBtn.disabled = false;
        }
    }

    document.getElementById('supplierForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        submitForm('supplierForm', '供应商');
    });

    document.getElementById('merchantForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        submitForm('merchantForm', '商家');
    });

    // ---------- 二维码点击放大和保存 ----------
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
        modalDiv.style.display = 'none';

        const closeBtn = modalDiv.querySelector('.qrcode-modal-close');
        closeBtn.addEventListener('click', () => {
            modalDiv.style.display = 'none';
        });
        modalDiv.addEventListener('click', (e) => {
            if (e.target === modalDiv) modalDiv.style.display = 'none';
        });
    }

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

    bindQrcodeClick();
});