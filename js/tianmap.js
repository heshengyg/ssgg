// tianmap.js - 最终版：加强区县提取和匹配
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
        console.log('逆地理编码结果：', result);
        if (result.getStatus && result.getStatus() === 0) {
            let comp = null;
            if (typeof result.getAddressComponent === 'function') {
                comp = result.getAddressComponent();
            } else if (result.addressComponent) {
                comp = result.addressComponent;
            }
            const detail = typeof result.getAddress === 'function' ? result.getAddress() : (result.formatted_address || '');

            if (comp) {
                console.log('comp JSON:', JSON.stringify(comp, null, 2));
                
                // 提取省市区 - 尝试多种可能的字段名
                let province = comp.province || '';
                let city = comp.city || '';
                let district = comp.district || comp.county || comp.area || ''; // 增加可能的区县字段
                
                // 如果 district 仍为空，尝试从 result 中获取
                if (!district) {
                    // 有些版本可能在 result 中有 district
                    district = result.district || '';
                }

                // 直辖市补全（如果 province 为空但 city 是直辖市）
                if (!province) {
                    if (city.includes('北京') || city.includes('天津') || city.includes('上海') || city.includes('重庆')) {
                        province = city; // 可能是“重庆市”或“重庆”
                        console.log('直辖市补全：', province);
                    }
                }

                // 极少数情况，从详细地址提取
                if (!province) {
                    if (detail.includes('重庆市')) province = '重庆市';
                    else if (detail.includes('北京市')) province = '北京市';
                    else if (detail.includes('天津市')) province = '天津市';
                    else if (detail.includes('上海市')) province = '上海市';
                }

                console.log('最终要填充的 province:', province, 'city:', city, 'district:', district);
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

    // 匹配函数
    function matchText(selectEl, text, level) {
        if (!selectEl) return false;
        if (!text) return false;

        console.log(`[${level}] 尝试匹配 "${text}" 在下拉框 ${selectEl.id} 中`);
        for (let opt of selectEl.options) {
            if (opt.text === text) {
                selectEl.value = opt.value;
                console.log(`[${level}] 精确匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }
        const clean = text.replace(/[省市县区]$/, '');
        for (let opt of selectEl.options) {
            if (opt.text.replace(/[省市县区]$/, '') === clean) {
                selectEl.value = opt.value;
                console.log(`[${level}] 去除后缀匹配成功：${text} -> ${opt.value}`);
                return true;
            }
        }
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

    // 尝试匹配省份
    let provMatched = false;
    if (provSelect && province) {
        provMatched = matchText(provSelect, province, '省份');
    }

    // 如果省份匹配失败或省份为空，则将完整地址填入详细地址框并提示
    if (!provMatched) {
        console.warn('省份匹配失败，将完整地址填入详细地址');
        if (detailInput) {
            const fullAddress = [province, city, district, detail].filter(Boolean).join('');
            detailInput.value = fullAddress || detail;
        }
        alert('系统未能自动匹配省市区，请手动选择省市区下拉框，详细地址已为您填充。');
        return; // 不再继续尝试填充省市区
    }

    // 省份匹配成功，继续
    provSelect.dispatchEvent(new Event('change'));

    // 判断是否为直辖市
    const isMunicipality = ['北京市', '天津市', '上海市', '重庆市'].some(m => province.includes(m) || m.includes(province));

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
            // 注意：此时 province 已经是直辖市，district 是区县名称
            matchText(distSelect, district, '区县');
        } else {
            console.log('等待区县下拉加载...');
            setTimeout(waitForDistrict, 100);
        }
    };

    if (isMunicipality) {
        console.log('直辖市，跳过城市匹配');
        if (citySelect) {
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
        waitForCity(() => {
            matchText(citySelect, city, '城市');
            citySelect.dispatchEvent(new Event('change'));
            setTimeout(waitForDistrict, 300);
        });
    }

    // 填充详细地址
    if (detailInput) {
        detailInput.value = detail;
    }
}

// 以下函数保持不变
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
                            let city = comp.city || '';
                            let district = comp.district || comp.county || comp.area || '';
                            if (!province) {
                                if (city.includes('北京') || city.includes('天津') || city.includes('上海') || city.includes('重庆')) {
                                    province = city;
                                }
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