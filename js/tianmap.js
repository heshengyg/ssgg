// tianmap.js - 修复直辖市 province 为空的问题
let map = null;
let currentFormId = null;
let isClickBound = false;

// 直辖市列表
const municipalities = ['北京市', '天津市', '上海市', '重庆市'];

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
        console.log('逆地理编码结果：', result);
        if (result.getStatus && result.getStatus() === 0) {
            // 获取地址组件
            let comp = null;
            if (typeof result.getAddressComponent === 'function') {
                comp = result.getAddressComponent();
            } else if (result.addressComponent) {
                comp = result.addressComponent;
            }
            const detail = typeof result.getAddress === 'function' ? result.getAddress() : (result.formatted_address || '');

            if (comp) {
                // 打印 comp 的所有属性
                console.log('comp 对象：', comp);
                console.log('comp.province:', comp.province);
                console.log('comp.city:', comp.city);
                console.log('comp.district:', comp.district);

                let province = comp.province || '';
                const city = comp.city || '';
                const district = comp.district || '';

                // 直辖市补全
                if (!province && municipalities.includes(city)) {
                    province = city;
                    console.log('直辖市自动补全 province 为：', province);
                }

                fillAddressToForm(currentFormId, province, city, district, detail);
            } else {
                alert('无法解析地址，请手动填写');
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

    console.log('填充地址：', { province, city, district, detail });

    // 增强匹配函数
    function matchText(selectEl, text, level) {
        if (!selectEl) return false;
        if (!text) return false;

        console.log(`[${level}] 尝试匹配 "${text}" 在下拉框 ${selectEl.id} 中`);

        // 1. 精确匹配
        for (let opt of selectEl.options) {
            if (opt.text === text) {
                selectEl.value = opt.value;
                console.log(`[${level}] 精确匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }

        // 2. 去除省市县区后缀后匹配
        const clean = text.replace(/[省市县区]$/, '');
        for (let opt of selectEl.options) {
            if (opt.text.replace(/[省市县区]$/, '') === clean) {
                selectEl.value = opt.value;
                console.log(`[${level}] 去除后缀匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }

        // 3. 包含匹配
        for (let opt of selectEl.options) {
            if (opt.text.includes(text) || text.includes(opt.text)) {
                selectEl.value = opt.value;
                console.log(`[${level}] 包含匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }

        console.log(`[${level}] 未找到匹配项：${text}`);
        return false;
    }

    // 1. 匹配省份
    let provMatched = false;
    if (provSelect) {
        provMatched = matchText(provSelect, province, '省份');
        // 如果省份是直辖市且未匹配成功，尝试更宽松的模糊匹配
        if (!provMatched && municipalities.includes(province)) {
            const shortName = province.replace(/[市]$/, ''); // 去掉末尾的“市”
            console.log(`直辖市未匹配，尝试模糊匹配 "${shortName}"`);
            for (let opt of provSelect.options) {
                if (opt.text.includes(shortName)) {
                    provSelect.value = opt.value;
                    console.log(`直辖市模糊匹配成功：${province} -> ${opt.text}`);
                    provMatched = true;
                    break;
                }
            }
        }

        if (provMatched) {
            provSelect.dispatchEvent(new Event('change'));
        } else {
            console.warn('省份匹配失败，但仍尝试触发 change');
            provSelect.dispatchEvent(new Event('change'));
        }
    }

    // 2. 处理城市和区县
    const isMunicipality = municipalities.includes(province);

    const waitForCity = (callback) => {
        if (citySelect && citySelect.options.length > 1) {
            console.log('城市下拉已加载，选项数：', citySelect.options.length);
            callback();
        } else {
            console.log('等待城市下拉加载...');
            setTimeout(() => waitForCity(callback), 100);
        }
    };

    const waitForDistrict = () => {
        if (distSelect && distSelect.options.length > 1) {
            console.log('区县下拉已加载，选项数：', distSelect.options.length);
            matchText(distSelect, district, '区县');
        } else {
            console.log('等待区县下拉加载...');
            setTimeout(waitForDistrict, 100);
        }
    };

    if (isMunicipality) {
        // 直辖市：不匹配城市，直接尝试选择“市辖区”或留空，然后匹配区县
        console.log('直辖市，跳过城市匹配');
        if (citySelect) {
            // 尝试选择“市辖区”
            let found = false;
            for (let opt of citySelect.options) {
                if (opt.text === '市辖区' || opt.text.includes('市辖区')) {
                    citySelect.value = opt.value;
                    console.log('直辖市自动选择城市：', opt.text);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.warn('未找到“市辖区”选项，城市留空');
                citySelect.value = '';
            }
            citySelect.dispatchEvent(new Event('change'));
        }
        // 等待区县加载
        setTimeout(waitForDistrict, 300);
    } else {
        // 非直辖市：先匹配城市，再匹配区县
        waitForCity(() => {
            matchText(citySelect, city, '城市');
            citySelect.dispatchEvent(new Event('change'));
            setTimeout(waitForDistrict, 300);
        });
    }

    // 填充详细地址
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
            map.setZoom(18);

            // 填充地址信息
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
                map.setZoom(18);

                const geocoder = new T.Geocoder();
                geocoder.getLocation(point, function(result) {
                    if (result.getStatus && result.getStatus() === 0) {
                        let comp = null;
                        if (typeof result.getAddressComponent === 'function') {
                            comp = result.getAddressComponent();
                        } else if (result.addressComponent) {
                            comp = result.addressComponent;
                        }
                        const detail = typeof result.getAddress === 'function' ? result.getAddress() : (result.formatted_address || '');
                        if (comp) {
                            let province = comp.province || '';
                            const city = comp.city || '';
                            const district = comp.district || '';
                            if (!province && municipalities.includes(city)) {
                                province = city;
                            }
                            fillAddressToForm(currentFormId, province, city, district, detail);
                        } else {
                            fillAddressToForm(currentFormId, '', '', '', `经度:${lon},纬度:${lat}`);
                        }
                    } else {
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
        bindLocate();
        if (map) map.panTo(new T.LngLat(116.397428, 39.90923));
    }, 300);
}

window.openMapPicker = openMapPicker;
console.log('天地图API版本：', T?.version);