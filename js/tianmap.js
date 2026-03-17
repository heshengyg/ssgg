// tianmap.js
let map = null;
let currentFormId = null;
let isClickBound = false;

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
    }
    return map;
}

// 地图点击事件
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

// 绑定搜索功能（每次打开弹窗时重新绑定）
function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    // 移除旧监听（通过克隆替换）
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
            // 打印 result 的所有属性和方法
            console.log('result 类型：', result.constructor?.name);
            console.log('result 可枚举属性：', Object.keys(result));
            console.log('result 所有属性名：', Object.getOwnPropertyNames(result));

            const status = result.getStatus ? result.getStatus() : -1;
            console.log('状态码：', status);

            if (status === 0) {
                let point = null;

                // 尝试方式1：直接获取点
                if (result.getLocation && typeof result.getLocation === 'function') {
                    point = result.getLocation();
                    console.log('通过 getLocation 获取点：', point);
                }

                // 尝试方式2：通过 POI 列表获取第一个点
                if (!point && result.getPoiList && typeof result.getPoiList === 'function') {
                    const poiList = result.getPoiList();
                    console.log('poiList 数量：', poiList?.length);
                    if (poiList && poiList.length > 0) {
                        const poi = poiList[0];
                        console.log('第一个 poi 对象：', poi);
                        console.log('poi 属性：', Object.keys(poi));
                        if (poi.getLngLat && typeof poi.getLngLat === 'function') {
                            point = poi.getLngLat();
                        } else if (poi.lnglat) {
                            point = poi.lnglat;
                        } else if (poi.location) {
                            point = poi.location;
                        } else if (poi.getLocation && typeof poi.getLocation === 'function') {
                            point = poi.getLocation();
                        }
                    }
                }

                // 尝试方式3：如果 result 本身有 lnglat 属性
                if (!point && result.lnglat) {
                    point = result.lnglat;
                }

                if (point) {
                    console.log('成功提取坐标点：', point);
                    map.panTo(point);
                    map.clearOverlays();
                    const marker = new T.Marker(point);
                    map.addOverlay(marker);
                    // 自动触发逆地理编码填充表单
                    const fakeEvent = { lnglat: point };
                    onMapClick(fakeEvent);
                } else {
                    console.error('无法从结果中提取坐标点，完整结果：', result);
                    alert('无法获取该地址的坐标点，请尝试更具体的地址');
                }
            } else {
                alert('地理编码失败，请检查地址或网络');
            }
        });
    });
}

// 打开地图选点弹窗
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

// 暴露全局方法
window.openMapPicker = openMapPicker;