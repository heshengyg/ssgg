// tianmap.js
let map = null;
let currentFormId = null;
let isClickBound = false;
let searchInitialized = false; // 标记搜索是否已初始化

// 初始化地图
function initMap() {
    if (!map) {
        map = new T.Map('mapContainer');
        map.centerAndZoom(new T.LngLat(116.397428, 39.90923), 12);
        map.addControl(new T.Control.Zoom());
        if (!isClickBound) {
            map.addEventListener('click', onMapClick);
            isClickBound = true;
        }
        // 初始化搜索（只执行一次）
        if (!searchInitialized) {
            initSearch();
            searchInitialized = true;
        }
    }
    return map;
}

// 初始化搜索功能
function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    // 移除之前可能绑定的所有事件（通过替换节点的方式不可取，改用直接添加事件，并确保只绑定一次）
    // 但为防止多次绑定，我们先移除之前添加的监听（如果已绑定，可先移除再添加，简单起见直接添加）
    searchBtn.addEventListener('click', function() {
        const address = searchInput.value.trim();
        if (!address) {
            alert('请输入地址');
            return;
        }

        if (!map) {
            alert('地图未初始化');
            return;
        }

        const geocoder = new T.Geocoder();
        geocoder.getPoint(address, function(result) {
            if (result.getStatus() === 0) {
                const point = result.getLocation();
                map.panTo(point);
                map.clearOverlays();
                const marker = new T.Marker(point);
                map.addOverlay(marker);
                // 模拟点击该点，触发逆地理编码填充表单
                const fakeEvent = { lnglat: point };
                onMapClick(fakeEvent);
            } else {
                alert('未找到该地址，请重新输入');
            }
        });
    });
}

// 地图点击事件处理
function onMapClick(e) {
    const lnglat = e.lnglat;
    const geocoder = new T.Geocoder();
    geocoder.getLocation(lnglat, function(result) {
        if (result.getStatus() === 0) {
            const comp = result.getAddressComponent();
            const detail = result.getAddress() || '';

            if (comp) {
                const province = comp.province || '';
                const city = comp.city || (comp.province ? '' : '');
                const district = comp.district || '';
                fillAddressToForm(currentFormId, province, city, district, detail);
            } else {
                alert('无法解析地址，请手动填写');
            }
        } else {
            alert('逆地理编码失败，请手动填写');
        }
    });
    document.getElementById('mapModal').style.display = 'none';
}

// 填充地址到表单
function fillAddressToForm(formId, province, city, district, detail) {
    const prefix = formId === 'supplier' ? 'supplier' : 'merchant';
    const provSelect = document.getElementById(prefix + 'Province');
    const citySelect = document.getElementById(prefix + 'City');
    const distSelect = document.getElementById(prefix + 'District');
    const detailInput = document.querySelector(`#${formId}Form input[name="detailAddress"]`);

    // 智能匹配（去除省市县后缀）
    function matchText(selectEl, text) {
        if (!selectEl) return false;
        for (let opt of selectEl.options) {
            if (opt.text === text) {
                selectEl.value = opt.value;
                return true;
            }
        }
        const clean = text.replace(/[省市县区]$/, '');
        for (let opt of selectEl.options) {
            if (opt.text.replace(/[省市县区]$/, '') === clean) {
                selectEl.value = opt.value;
                return true;
            }
        }
        return false;
    }

    if (provSelect) {
        matchText(provSelect, province);
        provSelect.dispatchEvent(new Event('change'));
    }

    const waitForCity = (callback) => {
        if (citySelect && citySelect.options.length > 1) {
            callback();
        } else {
            setTimeout(() => waitForCity(callback), 50);
        }
    };

    waitForCity(() => {
        matchText(citySelect, city);
        citySelect.dispatchEvent(new Event('change'));

        const waitForDistrict = () => {
            if (distSelect && distSelect.options.length > 1) {
                matchText(distSelect, district);
            } else {
                setTimeout(waitForDistrict, 50);
            }
        };
        waitForDistrict();
    });

    if (detailInput) detailInput.value = detail;
}

// 打开地图选点弹窗
function openMapPicker(formId) {
    currentFormId = formId;
    const modal = document.getElementById('mapModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        initMap(); // 内部会初始化搜索
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}

// 暴露全局方法
window.openMapPicker = openMapPicker;