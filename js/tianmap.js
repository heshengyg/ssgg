// tianmap.js - 最终版：支持从详细地址提取省份
let map = null;
let currentFormId = null;
let isClickBound = false;

// 省份名称列表（用于从详细地址提取）
const provinceNames = [
    '北京市', '天津市', '上海市', '重庆市',
    '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省',
    '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
    '河南省', '湖北省', '湖南省', '广东省', '海南省',
    '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省',
    '台湾省', '内蒙古自治区', '广西壮族自治区', '西藏自治区',
    '宁夏回族自治区', '新疆维吾尔自治区'
];

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

// 从详细地址中提取省份
function extractProvinceFromDetail(detail) {
    for (let p of provinceNames) {
        if (detail.includes(p)) {
            return p;
        }
    }
    return '';
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
                
                let province = comp.province || '';
                const city = comp.city || '';
                const district = comp.district || comp.County || comp.county || comp.area || '';

                // 直辖市补全（如果 province 为空且 city 是直辖市）
                if (!province) {
                    if (city.includes('北京') || city.includes('天津') || city.includes('上海') || city.includes('重庆')) {
                        province = city;
                        console.log('从 city 补全 province:', province);
                    }
                }

                // 如果 province 仍为空，尝试从详细地址提取
                if (!province) {
                    province = extractProvinceFromDetail(detail);
                    if (province) {
                        console.log('从 detail 提取 province:', province);
                    }
                }

                console.log('最终要填充的 province:', province, 'district:', district);
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
        return;
    }

    // 省份匹配成功，继续
    provSelect.dispatchEvent(new Event('change'));

    // 判断是否为直辖市（使用 province 判断）
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
            if (district) {
                matchText(distSelect, district, '区县');
            } else {
                console.warn('区县名称为空，无法匹配');
            }
        } else {
            console.log('等待区县下拉加载...');
            setTimeout(waitForDistrict, 100);
        }
    };

    if (isMunicipality) {
        console.log('直辖市处理...');
        const isCounty = district.includes('县');

        if (citySelect) {
            if (!isCounty) {
                // 区：尝试选择“市辖区”
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
            } else {
                // 县：城市留空
                console.log('直辖市县，城市留空');
                citySelect.value = '';
            }
            citySelect.dispatchEvent(new Event('change'));
        }
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
    if (detailInput) {
        detailInput.value = detail;
    }
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

            let province = '', city = '', district = '', detail = '';
            if (result.addressComponent) {
                province = result.addressComponent.province || '';
                city = result.addressComponent.city || '';
                district = result.addressComponent.district || result.addressComponent.County || '';
            }
            if (result.formatted_address) {
                detail = result.formatted_address;
            }
            // 如果 province 为空，尝试从 detail 提取
            if (!province) {
                province = extractProvinceFromDetail(detail);
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
                            const district = comp.district || comp.County || '';

                            if (!province) {
                                if (city.includes('北京') || city.includes('天津') || city.includes('上海') || city.includes('重庆')) {
                                    province = city;
                                } else {
                                    province = extractProvinceFromDetail(detail);
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