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
                fillAddressToForm(currentFormId, comp.province || '', comp.city || '', comp.district || '', detail);
            } else {
                alert('无法解析地址');
            }
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

// 搜索功能：每次打开弹窗时绑定
function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    // 移除之前绑定的所有事件（避免重复）
    searchBtn.replaceWith(searchBtn.cloneNode(true));
    const newSearchBtn = document.getElementById('searchBtn');

    newSearchBtn.addEventListener('click', function() {
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
        console.log('开始搜索地址：', address);
        geocoder.getPoint(address, function(result) {
            console.log('地理编码结果：', result);
            // 检查结果状态
            const status = result.getStatus ? result.getStatus() : -1;
            console.log('状态码：', status);

            if (status === 0) {
                // 尝试获取位置点（可能有多个结果）
                let point = null;
                // 方法1：如果 result.getLocation() 存在
                if (result.getLocation) {
                    point = result.getLocation();
                }
                // 方法2：如果有 poiList，取第一个的坐标
                if (!point && result.getPoiList) {
                    const poiList = result.getPoiList();
                    if (poiList && poiList.length > 0) {
                        const firstPoi = poiList[0];
                        if (firstPoi.getLngLat) {
                            point = firstPoi.getLngLat();
                        } else if (firstPoi.lnglat) {
                            point = firstPoi.lnglat;
                        }
                    }
                }
                // 方法3：如果有多个点，但上面都取不到，尝试从 result.poiList 直接取
                if (!point && result.poiList && result.poiList.length > 0) {
                    const poi = result.poiList[0];
                    point = poi.lnglat || poi.location;
                }

                if (point) {
                    map.panTo(point);
                    map.clearOverlays();
                    const marker = new T.Marker(point);
                    map.addOverlay(marker);
                    // 自动触发逆地理编码
                    const fakeEvent = { lnglat: point };
                    onMapClick(fakeEvent);
                } else {
                    alert('未找到该地址的坐标点，请尝试更具体的地址');
                }
            } else {
                alert('地理编码失败，请检查地址或网络');
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
        bindSearch();
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}

window.openMapPicker = openMapPicker;