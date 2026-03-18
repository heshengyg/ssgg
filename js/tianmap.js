// tianmap.js - 增加自动定位按钮，定位后放大到最大比例
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

    console.log('填充地址：', province, city, district, detail);

    // 直辖市列表
    const municipalities = ['北京市', '天津市', '上海市', '重庆市'];

    // 增强匹配函数
    function matchText(selectEl, text) {
        if (!selectEl) return false;
        if (!text) return false;

        console.log(`尝试匹配 "${text}" 在下拉框 ${selectEl.id} 中`);

        // 1. 精确匹配
        for (let opt of selectEl.options) {
            if (opt.text === text) {
                selectEl.value = opt.value;
                console.log(`精确匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }

        // 2. 去除省市县区后缀后匹配
        const clean = text.replace(/[省市县区]$/, '');
        for (let opt of selectEl.options) {
            if (opt.text.replace(/[省市县区]$/, '') === clean) {
                selectEl.value = opt.value;
                console.log(`去除后缀匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }

        // 3. 包含匹配
        for (let opt of selectEl.options) {
            if (opt.text.includes(text) || text.includes(opt.text)) {
                selectEl.value = opt.value;
                console.log(`包含匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }

        console.log(`未找到匹配项：${text}`);
        return false;
    }

    // 设置省份
    if (provSelect) {
        matchText(provSelect, province);
        provSelect.dispatchEvent(new Event('change'));
    }

    // 等待城市下拉加载
    const waitForCity = (callback) => {
        if (citySelect && citySelect.options.length > 1) {
            console.log('城市下拉已加载，开始处理城市');
            // 判断是否为直辖市
            if (municipalities.includes(province)) {
                // 直辖市：尝试选择“市辖区”
                let matched = false;
                for (let opt of citySelect.options) {
                    if (opt.text === '市辖区' || opt.text.includes('市辖区')) {
                        citySelect.value = opt.value;
                        console.log('直辖市自动选择：市辖区');
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    console.warn('未找到“市辖区”选项，城市留空');
                    citySelect.value = '';
                }
                citySelect.dispatchEvent(new Event('change'));
                // 直接进入区县处理
                setTimeout(() => {
                    if (distSelect && distSelect.options.length > 1) {
                        matchText(distSelect, district);
                    } else {
                        setTimeout(waitForDistrict, 50);
                    }
                }, 200);
            } else {
                // 非直辖市：正常匹配城市
                callback();
            }
        } else {
            setTimeout(() => waitForCity(callback), 50);
        }
    };

    // 区县处理（非直辖市用）
    const waitForDistrict = () => {
        if (distSelect && distSelect.options.length > 1) {
            matchText(distSelect, district);
        } else {
            setTimeout(waitForDistrict, 50);
        }
    };

    waitForCity(() => {
        // 非直辖市匹配城市
        matchText(citySelect, city);
        citySelect.dispatchEvent(new Event('change'));
        // 然后匹配区县
        setTimeout(waitForDistrict, 200);
    });

    if (detailInput) detailInput.value = detail;
}
function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

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
            map.panTo(point);
            map.setZoom(18); // 放大到最大比例

            // 填充地址
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

function bindLocate() {
    const locateBtn = document.getElementById('locateBtn');
    if (!locateBtn) return;

    const newBtn = locateBtn.cloneNode(true);
    locateBtn.parentNode.replaceChild(newBtn, locateBtn);

    newBtn.addEventListener('click', function() {
        if (!navigator.geolocation) {
            alert('您的浏览器不支持地理定位');
            return;
        }

        if (!map) {
            alert('地图未初始化');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lon = position.coords.longitude;
                const lat = position.coords.latitude;
                const point = new T.LngLat(lon, lat);
                map.panTo(point);
                map.setZoom(18); // 最大比例

                // 逆地理编码填充地址
                const geocoder = new T.Geocoder();
                geocoder.getLocation(point, function(result) {
                    if (result.getStatus && result.getStatus() === 0) {
                        const comp = result.getAddressComponent();
                        const detail = result.getAddress() || '';
                        fillAddressToForm(currentFormId, comp.province || '', comp.city || '', comp.district || '', detail);
                    } else {
                        // 如果逆地理编码失败，至少填充经纬度
                        fillAddressToForm(currentFormId, '', '', '', `经度:${lon},纬度:${lat}`);
                    }
                });
            },
            function(error) {
                let msg = '定位失败';
                if (error.code === 1) msg = '用户拒绝了位置权限';
                else if (error.code === 2) msg = '无法获取位置';
                else if (error.code === 3) msg = '定位超时';
                alert(msg);
            }
        );
    });
}

function openMapPicker(formId) {
    currentFormId = formId;
    const modal = document.getElementById('mapModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        initMap();
        bindSearch();
        bindLocate(); // 绑定定位按钮
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}

window.openMapPicker = openMapPicker;
console.log('天地图API版本：', T?.version);