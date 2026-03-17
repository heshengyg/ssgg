// tianmap.js
let map = null;
let currentFormId = null;
let isClickBound = false;

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

// 地图点击事件
function onMapClick(e) {
    const lnglat = e.lnglat;
    const geocoder = new T.Geocoder();
    geocoder.getLocation(lnglat, function(result) {
        // 注意：这里的 result 可能也是普通对象，但逆地理编码我们沿用之前的调用方式
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
            alert('地图未初始化，请稍后重试');
            return;
        }

        const geocoder = new T.Geocoder();
        console.log('开始搜索地址：', address);
        geocoder.getPoint(address, function(result) {
            console.log('地理编码结果：', result);
            console.log('result 类型：', result.constructor?.name);
            console.log('result 属性：', Object.keys(result));

            // 根据截图，result 是一个普通对象，有 status、location、formatted_address 等
            // 注意 status 可能是字符串 "0"
            const status = result.status;
            console.log('状态码：', status);

            if (status === '0' || status === 0) {
                // 尝试提取坐标点
                let point = null;

                // 方式1：直接从 result.location 获取经纬度
                if (result.location && result.location.lon !== undefined && result.location.lat !== undefined) {
                    const lon = parseFloat(result.location.lon);
                    const lat = parseFloat(result.location.lat);
                    if (!isNaN(lon) && !isNaN(lat)) {
                        point = new T.LngLat(lon, lat);
                        console.log('从 result.location 提取点：', point);
                    }
                }

                if (point) {
                    console.log('成功提取坐标点：', point);
                    map.panTo(point);
                    map.clearOverlays();
                    const marker = new T.Marker(point);
                    map.addOverlay(marker);

                    // 尝试获取省市区和详细地址
                    let province = '', city = '', district = '', detail = '';

                    // 如果有 addressComponent 则解析
                    if (result.addressComponent) {
                        province = result.addressComponent.province || '';
                        city = result.addressComponent.city || '';
                        district = result.addressComponent.district || '';
                    }
                    // 详细地址优先取 formatted_address
                    if (result.formatted_address) {
                        detail = result.formatted_address;
                    }

                    // 填充表单
                    fillAddressToForm(currentFormId, province, city, district, detail);
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
    if (!modal) {
        console.error('找不到地图弹窗元素');
        return;
    }

    // 显示弹窗
    modal.style.display = 'flex';

    // 确保弹窗已经显示后再初始化地图
    setTimeout(() => {
        const mapInstance = initMap();
        if (mapInstance) {
            bindSearch(); // 绑定搜索按钮
            mapInstance.panTo(new T.LngLat(116.397428, 39.90923));
        } else {
            alert('地图加载失败，请刷新页面');
        }
    }, 300);
}

// 暴露全局方法
window.openMapPicker = openMapPicker;

console.log('天地图API版本：', T?.version || '未知');