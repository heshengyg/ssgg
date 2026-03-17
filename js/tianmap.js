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

    setSelectByText(provSelect, province);
    provSelect.dispatchEvent(new Event('change'));
    setTimeout(() => {
        setSelectByText(citySelect, city);
        citySelect.dispatchEvent(new Event('change'));
        setTimeout(() => {
            setSelectByText(distSelect, district);
        }, 200);
    }, 200);

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