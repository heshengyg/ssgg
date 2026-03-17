// tianmap.js - 极简稳定版
let map = null;
let currentFormId = null;
let isClickBound = false;

function initMap() {
    if (!map) {
        try {
            map = new T.Map('mapContainer');
            map.centerAndZoom(new T.LngLat(116.397428, 39.90923), 12);
            if (!isClickBound) {
                map.addEventListener('click', onMapClick);
                isClickBound = true;
            }
            console.log('地图初始化成功');
        } catch (e) {
            console.error('初始化失败', e);
            alert('地图初始化失败');
        }
    }
    return map;
}

function onMapClick(e) {
    const lnglat = e.lnglat;
    const geocoder = new T.Geocoder();
    geocoder.getLocation(lnglat, function(result) {
        if (result.getStatus && result.getStatus() === 0) {
            const comp = result.getAddressComponent();
            fillAddressToForm(currentFormId, comp.province || '', comp.city || '', comp.district || '', result.getAddress() || '');
        } else {
            alert('逆地理编码失败');
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

function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    // 确保按钮事件唯一
    const newBtn = searchBtn.cloneNode(true);
    searchBtn.parentNode.replaceChild(newBtn, searchBtn);

    newBtn.addEventListener('click', function() {
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
        console.log('搜索地址：', address);
        geocoder.getPoint(address, function(result) {
            console.log('搜索结果：', result);
            if (!result || (result.status !== '0' && result.status !== 0)) {
                alert('未找到该地址');
                return;
            }

            // 提取坐标
            let lon, lat;
            if (result.location) {
                lon = result.location.lon;
                lat = result.location.lat;
            } else if (result.poiList && result.poiList.length > 0) {
                lon = result.poiList[0].location?.lon;
                lat = result.poiList[0].location?.lat;
            } else {
                alert('无法定位');
                return;
            }

            const point = new T.LngLat(parseFloat(lon), parseFloat(lat));
            console.log('定位到：', point);
            map.panTo(point);
            map.setZoom(15);

            // 直接填充地址（如果有）
            let province = '', city = '', district = '', detail = '';
            if (result.addressComponent) {
                province = result.addressComponent.province || '';
                city = result.addressComponent.city || '';
                district = result.addressComponent.district || '';
            }
            if (result.formatted_address) {
                detail = result.formatted_address;
            }
            fillAddressToForm(currentFormId, province, city, district, detail);
        });
    });
}

function openMapPicker(formId) {
    currentFormId = formId;
    const modal = document.getElementById('mapModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        initMap();
        bindSearch();
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}

window.openMapPicker = openMapPicker;
console.log('天地图API版本：', T?.version);