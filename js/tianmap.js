// tianmap.js
let map = null;
let currentFormId = null;
let isClickBound = false;
let currentMarkers = []; // 存储当前显示的标记

// 初始化地图
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

// 清除所有标记
function clearMarkers() {
    if (currentMarkers.length) {
        currentMarkers.forEach(marker => map.removeOverlay(marker));
        currentMarkers = [];
    }
    map.clearOverlays(); // 同时清除其他覆盖物
}

// 地图点击（逆地理编码）
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

// 绑定搜索功能
function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

    // 移除旧监听（克隆替换）
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
        console.log('搜索地址：', address);
        geocoder.getPoint(address, function(result) {
            console.log('搜索结果：', result);

            const status = result.status;
            if (status !== '0' && status !== 0) {
                alert('未找到该地址');
                return;
            }

            // 清除旧标记
            clearMarkers();

            // 尝试提取结果列表
            let poiList = null;
            if (result.poiList && Array.isArray(result.poiList)) {
                poiList = result.poiList;
            } else if (result.resultList && Array.isArray(result.resultList)) {
                poiList = result.resultList;
            } else if (result.location) {
                // 单个结果包装成数组
                poiList = [result];
            }

            if (!poiList || poiList.length === 0) {
                alert('无结果');
                return;
            }

            // 在地图上添加标记
            poiList.forEach((poi, index) => {
                // 提取经纬度
                let lon, lat;
                if (poi.location) {
                    lon = poi.location.lon;
                    lat = poi.location.lat;
                } else if (poi.lon !== undefined && poi.lat !== undefined) {
                    lon = poi.lon;
                    lat = poi.lat;
                } else if (poi.lnglat) {
                    lon = poi.lnglat.lon;
                    lat = poi.lnglat.lat;
                } else if (poi.getLngLat) {
                    const pt = poi.getLngLat();
                    lon = pt.lon;
                    lat = pt.lat;
                }

                if (lon === undefined || lat === undefined) {
                    console.warn('无法获取坐标', poi);
                    return;
                }

                const lnglat = new T.LngLat(parseFloat(lon), parseFloat(lat));
                const marker = new T.Marker(lnglat);

                // 标记点击事件
                marker.addEventListener('click', function() {
                    // 提取地址信息
                    let province = '', city = '', district = '', detail = '';
                    if (poi.addressComponent) {
                        province = poi.addressComponent.province || '';
                        city = poi.addressComponent.city || '';
                        district = poi.addressComponent.district || '';
                    }
                    if (poi.formatted_address) {
                        detail = poi.formatted_address;
                    } else if (poi.address) {
                        detail = poi.address;
                    } else if (poi.name) {
                        detail = poi.name;
                    }
                    fillAddressToForm(currentFormId, province, city, district, detail);
                    document.getElementById('mapModal').style.display = 'none';
                });

                map.addOverlay(marker);
                currentMarkers.push(marker);

                // 将第一个结果设为地图中心并缩放
                if (index === 0) {
                    map.panTo(lnglat);
                    map.setZoom(15);
                }
            });

            // 提示用户点击标记
            alert(`找到 ${poiList.length} 个结果，请点击地图上的标记选择地址`);
        });
    });
}

// 打开地图选点弹窗
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

// 暴露全局方法
window.openMapPicker = openMapPicker;

console.log('天地图API版本：', T?.version || '未知');