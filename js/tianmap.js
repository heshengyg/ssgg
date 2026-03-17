// tianmap.js
let map = null;
let currentFormId = null;
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

function fillAddressToForm(formId, province, city, district, detail) {
    const prefix = formId === 'supplier' ? 'supplier' : 'merchant';
    const provSelect = document.getElementById(prefix + 'Province');
    const citySelect = document.getElementById(prefix + 'City');
    const distSelect = document.getElementById(prefix + 'District');
    const detailInput = document.querySelector(`#${formId}Form input[name="detailAddress"]`);

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

function setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    searchBtn.replaceWith(searchBtn.cloneNode(true));
    const newSearchBtn = document.getElementById('searchBtn');

    newSearchBtn.addEventListener('click', function() {
        const address = searchInput.value.trim();
        if (!address) {
            alert('请输入地址');
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
                const fakeEvent = { lnglat: point };
                onMapClick(fakeEvent);
            } else {
                alert('未找到该地址，请重新输入');
            }
        });
    });
}

function openMapPicker(formId) {
    currentFormId = formId;
    const modal = document.getElementById('mapModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        initMap();
        setupSearch();
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}

window.openMapPicker = openMapPicker;