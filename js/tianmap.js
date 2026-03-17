// tianmap.js
let map = null;
let currentFormId = null; // 当前操作的表单标识 'supplier' 或 'merchant'
let isClickBound = false;

function initMap() {
    if (!map) {
        map = new T.Map('mapContainer');
        map.centerAndZoom(new T.LngLat(116.397428, 39.90923), 12);
        map.addControl(new T.Control.Zoom());
        if (!isClickBound) {
            map.addEventListener('click', onMapClick);
            isClickBound = true;
        }
    }
    return map;
}

function onMapClick(e) {
    const lnglat = e.lnglat;
    const geocoder = new T.Geocoder();
    geocoder.getLocation(lnglat, function(result) {
        if (result.getStatus() === 0) {
            // 获取地址组件（省市区）
            const comp = result.getAddressComponent();
            // 获取详细地址（街道+门牌号）
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

function fillAddressToForm(formId, province, city, district, detail) {
    const prefix = formId === 'supplier' ? 'supplier' : 'merchant';
    const provSelect = document.getElementById(prefix + 'Province');
    const citySelect = document.getElementById(prefix + 'City');
    const distSelect = document.getElementById(prefix + 'District');
    const detailInput = document.querySelector(`#${formId}Form input[name="detailAddress"]`);

    // 辅助函数：智能匹配（去除省市县后缀）
    function matchText(selectEl, text) {
        if (!selectEl) return false;
        // 尝试精确匹配
        for (let opt of selectEl.options) {
            if (opt.text === text) {
                selectEl.value = opt.value;
                return true;
            }
        }
        // 尝试模糊匹配（去除“市”、“省”、“区”等）
        const clean = text.replace(/[省市县区]$/, '');
        for (let opt of selectEl.options) {
            if (opt.text.replace(/[省市县区]$/, '') === clean) {
                selectEl.value = opt.value;
                return true;
            }
        }
        return false;
    }

    // 设置省
    if (provSelect) {
        matchText(provSelect, province);
        provSelect.dispatchEvent(new Event('change'));
    }

    // 等待城市列表加载（轮询检查）
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

        // 等待区县列表加载
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

function setSelectByText(selectEl, text) {
    if (!selectEl) return;
    for (let opt of selectEl.options) {
        if (opt.text === text) {
            selectEl.value = opt.value;
            return;
        }
    }
}

function openMapPicker(formId) {
    currentFormId = formId;
    const modal = document.getElementById('mapModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        initMap();
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}

window.openMapPicker = openMapPicker;
// 搜索功能
function setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    searchBtn.addEventListener('click', function() {
        const address = searchInput.value.trim();
        if (!address) return;

        // 使用地理编码获取坐标
        const geocoder = new T.Geocoder();
        geocoder.getPoint(address, function(result) {
            if (result.getStatus() === 0) {
                const point = result.getLocation(); // 返回 T.LngLat 对象
                map.panTo(point);
                // 可选：添加一个临时标记
                const marker = new T.Marker(point);
                map.clearOverlays();
                map.addOverlay(marker);
                // 自动触发逆地理编码填充（可选，如果希望直接填充）
                // 这里我们让用户自己点击地图，所以只定位不填充
            } else {
                alert('未找到该地址，请重新输入');
            }
        });
    });
}

// 在 openMapPicker 中调用 setupSearch
function openMapPicker(formId) {
    currentFormId = formId;
    const modal = document.getElementById('mapModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        initMap();
        setupSearch(); // 绑定搜索事件
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}