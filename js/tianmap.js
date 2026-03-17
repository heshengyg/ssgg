// tianmap.js
let map = null;
let currentFormId = null;
let isClickBound = false;
let currentMarkers = [];

function initMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) {
        console.error('地图容器不存在');
        return null;
    }

    if (!map) {
        try {
            map = new T.Map('mapContainer');
            map.centerAndZoom(new T.LngLat(116.397428, 39.90923), 12);
            map.addControl(new T.Control.Zoom());
            if (!isClickBound) {
                map.addEventListener('click', onMapClick);
                isClickBound = true;
            }
            console.log('地图初始化成功');
        } catch (e) {
            console.error('地图初始化失败：', e);
            alert('地图初始化失败，请刷新页面重试');
            return null;
        }
    }
    return map;
}

function clearMarkers() {
    if (currentMarkers.length) {
        currentMarkers.forEach(marker => map.removeOverlay(marker));
        currentMarkers = [];
    }
}

function onMapClick(e) {
    const lnglat = e.lnglat;
    const geocoder = new T.Geocoder();
    geocoder.getLocation(lnglat, function(result) {
        if (result.getStatus && result.getStatus() === 0) {
            const comp = result.getAddressComponent();
            const detail = result.getAddress() || '';
            if (comp) {
                fillAddressToForm(currentFormId, comp.province || '', comp.city || '', comp.district || '', detail);
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

function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    // 移除旧监听
    searchBtn.replaceWith(searchBtn.cloneNode(true));
    const newSearchBtn = document.getElementById('searchBtn');

    newSearchBtn.addEventListener('click', function() {
        const address = searchInput.value.trim();
        if (!address) {
            alert('请输入地址');
            return;
        }

        if (!map) {
            alert('地图未初始化，请稍后重试');
            return;
        }

        const geocoder = new T.Geocoder();
        console.log('开始搜索地址：', address);
        geocoder.getPoint(address, function(result) {
            console.log('地理编码结果：', result);

            const status = result.status;
            if (status !== '0' && status !== 0) {
                alert('未找到该地址');
                return;
            }

            // 清除旧标记
            clearMarkers();

            // 尝试获取坐标
            let lon, lat;
            if (result.location) {
                lon = result.location.lon;
                lat = result.location.lat;
            } else if (result.poiList && result.poiList.length > 0) {
                lon = result.poiList[0].location?.lon;
                lat = result.poiList[0].location?.lat;
            }

            if (lon === undefined || lat === undefined) {
                console.error('无法提取坐标', result);
                alert('无法定位该地址');
                return;
            }

            const point = new T.LngLat(parseFloat(lon), parseFloat(lat));
            console.log('坐标点：', point);

            // 添加新标记
            const marker = new T.Marker(point);
            map.addOverlay(marker);
            currentMarkers.push(marker);

            // 移动到该点并缩放
            map.panTo(point);
            map.setZoom(15);

            // 可选：直接填充地址信息（如果有）
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

            // 不自动关闭弹窗，让用户确认
            // alert('已定位，请点击地图上的标记确认');
        });
    });
}

function openMapPicker(formId) {
    currentFormId = formId;
    const modal = document.getElementById('mapModal');
    if (!modal) {
        console.error('找不到地图弹窗元素');
        return;
    }

    modal.style.display = 'flex';
    setTimeout(() => {
        const mapInstance = initMap();
        if (mapInstance) {
            bindSearch();
            mapInstance.panTo(new T.LngLat(116.397428, 39.90923));
        } else {
            alert('地图加载失败，请刷新页面');
        }
    }, 300);
}

window.openMapPicker = openMapPicker;
console.log('天地图API版本：', T?.version || '未知');