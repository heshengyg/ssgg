// main.js - 微信100%兼容版（简介+要闻 图片点击/左右/缩放全正常）
// 全局图片查看器（微信专属优化）
function createImageModal() {
    if (document.getElementById('imageModal')) return;
    const modalDiv = document.createElement('div');
    modalDiv.id = 'imageModal';
    modalDiv.className = 'image-modal';
    modalDiv.style.cssText = `
        display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 9999; justify-content: center; align-items: center;
        flex-direction: column;
    `;
    modalDiv.innerHTML = `
        <span class="image-modal-close" style="position: absolute; top: 20px; right: 30px; color: #fff; font-size: 40px; cursor: pointer; z-index: 10000;">&times;</span>
        <div class="image-modal-content" style="width: 90%; height: 80%; display: flex; justify-content: center; align-items: center;">
            <img id="imageModalImg" style="max-width: 100%; max-height: 100%; object-fit: contain; touch-action: none;" src="" alt="">
        </div>
        <div class="image-modal-nav" style="margin-top: 10px; display: flex; gap: 20px; color: #fff;">
            <button class="image-modal-prev" style="background: #333; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;" disabled>&lt;</button>
            <span class="image-modal-counter"></span>
            <button class="image-modal-next" style="background: #333; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;" disabled>&gt;</button>
        </div>
        <div class="image-modal-tip" style="color: #ccc; margin-top: 8px; font-size: 12px;">双指缩放 / 拖动 / 左右切换</div>
    `;
    document.body.appendChild(modalDiv);

    const closeBtn = modalDiv.querySelector('.image-modal-close');
    const img = modalDiv.querySelector('#imageModalImg');
    closeBtn.addEventListener('click', () => { resetImageScale(); modalDiv.style.display = 'none'; });
    modalDiv.addEventListener('click', (e) => { if (e.target === modalDiv) { resetImageScale(); modalDiv.style.display = 'none'; } });
    img.addEventListener('click', () => { resetImageScale(); modalDiv.style.display = 'none'; });

    // 微信双指缩放+拖动（强制兼容）
    let scale=1, startX=0, startY=0, translateX=0, translateY=0, lastScale=1, isDragging=false, startDistance=0;
    function resetImageScale() {
        scale=1; translateX=0; translateY=0; lastScale=1;
        img.style.transform = 'translate(0,0) scale(1)';
        img.style.transition = 'transform 0.2s ease';
    }
    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const [p1,p2] = e.touches;
            startDistance = Math.hypot(p1.clientX-p2.clientX, p1.clientY-p2.clientY);
        } else if (e.touches.length === 1) {
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
            isDragging = true;
        }
    }, { passive: true });
    img.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            const [p1,p2] = e.touches;
            const dist = Math.hypot(p1.clientX-p2.clientX, p1.clientY-p2.clientY);
            scale = lastScale * (dist/startDistance);
            scale = Math.max(0.5, Math.min(3, scale));
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        } else if (e.touches.length === 1 && isDragging && scale>1) {
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }
    }, { passive: false });
    img.addEventListener('touchend', () => { lastScale=scale; isDragging=false; });
    window.resetImageScale = resetImageScale;
}

let currentImageList = [], currentImageIndex = 0;
function showImageModal(images, index) {
    const modal = document.getElementById('imageModal');
    if (!modal || !images || images.length===0) return;
    currentImageList = images;
    currentImageIndex = Math.max(0, Math.min(index, images.length-1));
    updateImageModal();
    modal.style.display = 'flex';
    resetImageScale();
}
function updateImageModal() {
    const modal = document.getElementById('imageModal');
    if (!modal || currentImageList.length===0) return;
    const img = modal.querySelector('#imageModalImg');
    const prevBtn = modal.querySelector('.image-modal-prev');
    const nextBtn = modal.querySelector('.image-modal-next');
    const counter = modal.querySelector('.image-modal-counter');
    img.src = currentImageList[currentImageIndex].src;
    img.alt = currentImageList[currentImageIndex].alt || '图片';
    counter.textContent = `${currentImageIndex+1} / ${currentImageList.length}`;
    prevBtn.disabled = currentImageIndex === 0;
    nextBtn.disabled = currentImageIndex === currentImageList.length-1;
}
function bindImageModalEvents() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;
    const prevBtn = modal.querySelector('.image-modal-prev');
    const nextBtn = modal.querySelector('.image-modal-next');
    prevBtn.addEventListener('click', () => {
        if (currentImageIndex>0) { currentImageIndex--; updateImageModal(); resetImageScale(); }
    });
    nextBtn.addEventListener('click', () => {
        if (currentImageIndex < currentImageList.length-1) { currentImageIndex++; updateImageModal(); resetImageScale(); }
    });
}

// ✅ 微信专属：全局事件委托（解决动态img点击失效，简介/要闻通用）
document.addEventListener('DOMContentLoaded', () => {
    // 全局委托：所有带data-img-index的图片，点击触发弹窗
    document.addEventListener('click', (e) => {
        const imgEl = e.target.closest('img[data-img-group]');
        if (!imgEl) return;
        e.stopPropagation();
        const group = imgEl.dataset.imgGroup;
        const index = parseInt(imgEl.dataset.imgIndex, 10);
        const imageList = window[`_imgGroup_${group}`] || [];
        showImageModal(imageList, index);
    });
    // 微信touchend兼容（解决click延迟/拦截）
    document.addEventListener('touchend', (e) => {
        const imgEl = e.target.closest('img[data-img-group]');
        if (!imgEl) return;
        e.stopPropagation();
        const group = imgEl.dataset.imgGroup;
        const index = parseInt(imgEl.dataset.imgIndex, 10);
        const imageList = window[`_imgGroup_${group}`] || [];
        showImageModal(imageList, index);
    }, { passive: true });
});

// ✅ 统一绑定：给图片加data标记+存入全局组（微信必须）
function bindImageClick(container, imageList, groupName) {
    if (!container || imageList.length===0) return;
    window[`_imgGroup_${groupName}`] = imageList; // 存入全局，委托可访问
    const imgs = container.querySelectorAll('img');
    imgs.forEach((imgEl, idx) => {
        imgEl.dataset.imgGroup = groupName; // 标记组
        imgEl.dataset.imgIndex = idx; // 标记索引
        imgEl.style.cursor = 'pointer';
        imgEl.style.touchAction = 'manipulation';
        // 微信关键：禁用默认长按菜单，不拦截点击
        imgEl.style.webkitTouchCallout = 'none';
        imgEl.style.userSelect = 'none';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ main.js loaded (微信兼容版)');

    // ---------- 左侧菜单 ----------
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const currentPage = document.querySelector('.page.active');
            const targetPage = document.getElementById(targetId);
            if (currentPage && currentPage!==targetPage) {
                currentPage.querySelectorAll('video').forEach(v=>v.pause());
            }
            menuItems.forEach(m=>m.classList.remove('active'));
            pages.forEach(p=>p.classList.remove('active'));
            this.classList.add('active');
            targetPage.classList.add('active');
        });
    });

    // ---------- ✅ 修复：平台简介（微信必生效） ----------
    fetch('data/intro.json')
        .then(res=>{if(!res.ok)throw new Error('网络失败');return res.json();})
        .then(contentBlocks=>{
            const introContent = document.getElementById('intro-content');
            if(!introContent)return;
            introContent.innerHTML = '';
            const introImages = [];
            contentBlocks.forEach(block=>{
                if(block.type==='text'){
                    const p=document.createElement('p');
                    p.innerHTML=block.content;
                    p.classList.add(block.indent?'indent-paragraph':'no-indent-paragraph');
                    introContent.appendChild(p);
                }else if(block.type==='image'){
                    const img=document.createElement('img');
                    img.src=block.src;
                    img.alt=block.alt||'';
                    img.style.maxWidth='100%';
                    img.style.margin='10px 0';
                    img.loading='lazy';
                    introContent.appendChild(img);
                    introImages.push({src:block.src, alt:block.alt||''});
                }else if(block.type==='video'){
                    const video=document.createElement('video');
                    video.src=block.src;
                    if(block.poster)video.poster=block.poster;
                    video.controls=true; video.autoplay=true; video.muted=true; video.loop=true;
                    video.style.maxWidth='100%'; video.style.margin='10px 0';
                    video.style.borderRadius='8px'; video.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';
                    introContent.appendChild(video);
                }
            });
            // ✅ 关键：简介绑定（组名intro）
            bindImageClick(introContent, introImages, 'intro');
        })
        .catch(err=>{
            console.error('简介加载失败',err);
            document.getElementById('intro-content').innerHTML='<p style="color:red;">简介加载失败</p>';
        });

    // ---------- ✅ 修复：平台要闻（保持一致，组名news+id） ----------
    fetch('data/news.json')
        .then(res=>res.json())
        .then(newsArray=>{
            const newsList=document.getElementById('news-list');
            if(!newsList)return;
            newsList.innerHTML='';
            function pauseAllVideos(){document.querySelectorAll('.news-content video').forEach(v=>v.pause());}
            function makeVideoExclusive(video){
                video.addEventListener('play',()=>{
                    document.querySelectorAll('.news-content video').forEach(v=>v!==video&&v.pause());
                });
            }
            newsArray.forEach((item,newsIdx)=>{
                const article=document.createElement('article'); article.className='news-item';
                const header=document.createElement('div'); header.className='news-header';
                header.innerHTML=`<h3>${item.title}</h3><div class="news-time">📆 ${item.time}</div>`;
                const content=document.createElement('div'); content.className='news-content'; content.style.display='none';
                const newsImages=[];
                if(Array.isArray(item.content)){
                    item.content.forEach(block=>{
                        if(block.type==='text'){
                            const p=document.createElement('p'); p.innerHTML=block.value;
                            p.classList.add(block.indent?'indent-paragraph':'no-indent-paragraph');
                            content.appendChild(p);
                        }else if(block.type==='image'){
                            const img=document.createElement('img'); img.src=block.src; img.alt=block.alt||'';
                            img.style.maxWidth='100%'; img.style.margin='10px 0'; img.loading='lazy';
                            content.appendChild(img); newsImages.push({src:block.src, alt:block.alt||''});
                        }else if(block.type==='video'){
                            const video=document.createElement('video'); video.src=block.src;
                            if(block.poster)video.poster=block.poster;
                            video.controls=true; video.autoplay=true; video.muted=true; video.loop=true;
                            video.style.maxWidth='100%'; video.style.margin='10px 0';
                            video.style.borderRadius='8px'; video.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';
                            makeVideoExclusive(video); content.appendChild(video);
                        }
                    });
                }else{
                    const p=document.createElement('p'); p.textContent=item.content; content.appendChild(p);
                }
                // ✅ 要闻绑定（组名news_+索引，避免冲突）
                bindImageClick(content, newsImages, `news_${newsIdx}`);
                article.appendChild(header); article.appendChild(content);
                header.addEventListener('click',()=>{
                    if(content.style.display==='none'){pauseAllVideos(); content.style.display='block';}
                    else{content.style.display='none'; content.querySelectorAll('video').forEach(v=>v.pause());}
                });
                newsList.appendChild(article);
            });
        })
        .catch(err=>{
            console.warn('新闻加载失败',err);
            document.getElementById('news-list').innerHTML='<p style="color:red;">要闻加载失败</p>';
        });

    // ---------- 省市区、地图、表单、二维码（保持不变） ----------
    fetch('data/areas_nested.json')
        .then(res=>{if(!res.ok)throw new Error('网络失败');return res.json();})
        .then(areaData=>{
            function initProvince(provId,cityId,distId){
                const prov=document.getElementById(provId), city=document.getElementById(cityId), dist=document.getElementById(distId);
                if(!prov)return;
                prov.innerHTML='<option value="">请选择省</option>';
                areaData.forEach(p=>prov.add(new Option(p.name,p.code)));
                prov.addEventListener('change',()=>{
                    const p=areaData.find(x=>x.code==prov.value);
                    city.innerHTML='<option value="">请选择市</option>'; dist.innerHTML='<option value="">请选择区</option>';
                    p?.children?.forEach(c=>city.add(new Option(c.name,c.code)));
                });
                city.addEventListener('change',()=>{
                    const p=areaData.find(x=>x.code==prov.value);
                    const c=p?.children?.find(x=>x.code==city.value);
                    dist.innerHTML='<option value="">请选择区</option>';
                    c?.children?.forEach(d=>dist.add(new Option(d.name,d.code)));
                });
            }
            initProvince('supplierProvince','supplierCity','supplierDistrict');
            initProvince('merchantProvince','merchantCity','merchantDistrict');
        })
        .catch(err=>{
            console.error('省市区加载失败',err);
            document.querySelectorAll('.address-group select').forEach(s=>s.innerHTML='<option value="">加载失败</option>');
        });

    // 地图选点
    document.querySelectorAll('.map-pick-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{window.openMapPicker(btn.dataset.form);});
    });
    document.querySelector('.close')?.addEventListener('click',()=>{document.getElementById('mapModal').style.display='none';});
    window.addEventListener('click',e=>{
        const modal=document.getElementById('mapModal'); if(e.target===modal)modal.style.display='none';
    });

    // 表单提交
    const API_ENDPOINT='/submit';
    async function submitForm(formId,type){
        const form=document.getElementById(formId); if(!form)return;
        const shopName=form.querySelector('[name=shopName]').value.trim();
        const contactName=form.querySelector('[name=contactName]').value.trim();
        const contactPhone=form.querySelector('[name=contactPhone]').value.trim();
        const detailAddr=form.querySelector('[name=detailAddress]').value.trim();
        const prov=form.querySelector('[name=province]'), city=form.querySelector('[name=city]'), dist=form.querySelector('[name=district]');
        const province=prov.options[prov.selectedIndex]?.text||'', cityName=city.options[city.selectedIndex]?.text||'', district=dist.options[dist.selectedIndex]?.text||'';
        if(!shopName||!contactName||!contactPhone||!province||!cityName||!district||!detailAddr){alert('请填全必填项');return false;}
        const payload={type,shopName,contactName,contactPhone,province,city:cityName,district,detailAddress:detailAddr,timestamp:new Date().toISOString()};
        try{
            const btn=form.querySelector('[type=submit]'); btn.textContent='提交中...'; btn.disabled=true;
            const res=await fetch(API_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            const result=await res.json();
            if(result.code===0){alert(`${type}申请成功`); form.reset();}else throw new Error(result.message||'失败');
        }catch(e){console.error('提交失败',e); alert('提交失败，请重试');}
        finally{const btn=form.querySelector('[type=submit]'); btn.textContent='提交入驻申请'; btn.disabled=false;}
    }
    document.getElementById('supplierForm')?.addEventListener('submit',e=>{e.preventDefault(); submitForm('supplierForm','供应商');});
    document.getElementById('merchantForm')?.addEventListener('submit',e=>{e.preventDefault(); submitForm('merchantForm','商家');});

    // 二维码
    function createQrcodeModal(){
        if(document.getElementById('qrcodeModal'))return;
        const modal=document.createElement('div'); modal.id='qrcodeModal'; modal.className='qrcode-modal';
        modal.style.cssText='display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;justify-content:center;align-items:center;flex-direction:column;';
        modal.innerHTML=`<span class="qrcode-modal-close" style="position:absolute;top:20px;right:30px;color:#fff;font-size:40px;cursor:pointer;">&times;</span><div style="width:80%;height:80%;display:flex;justify-content:center;align-items:center;"><img id="qrcodeModalImg" style="max-width:100%;max-height:100%;" src="" alt="二维码"></div><div style="color:#ccc;margin-top:10px;">长按保存</div>`;
        document.body.appendChild(modal);
        modal.querySelector('.qrcode-modal-close').addEventListener('click',()=>modal.style.display='none');
        modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
    }
    function bindQrcode(){
        const imgs=document.querySelectorAll('.qrcode-img'); if(imgs.length===0)return; createQrcodeModal();
        imgs.forEach(img=>{img.addEventListener('click',e=>{e.stopPropagation();document.getElementById('qrcodeModalImg').src=img.src;document.getElementById('qrcodeModal').style.display='flex';});});
    }
    bindQrcode();

    // 初始化图片查看器
    createImageModal();
    bindImageModalEvents();
});