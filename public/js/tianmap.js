// tianmap.js - 最终完善版（修正直辖市县的城市级选择）
let map = null;
let currentFormId = null;
let isClickBound = false;
let currentMarkers = [];

// 直辖市列表
const municipalities = ['北京市', '天津市', '上海市', '重庆市'];

function initMap() {
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
            console.error('初始化失败', e);
            alert('地图初始化失败');
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
                let province = comp.province || '';
                const city = comp.city || '';
                let district = comp.district || comp.County || comp.county || comp.area || '';

                // 直辖市补全
                if (!province) {
                    if (city.includes('北京') || city.includes('天津') || city.includes('上海') || city.includes('重庆')) {
                        province = city;
                    } else if (detail.includes('重庆市')) province = '重庆市';
                    else if (detail.includes('北京市')) province = '北京市';
                    else if (detail.includes('天津市')) province = '天津市';
                    else if (detail.includes('上海市')) province = '上海市';
                }

                // 从详细地址提取区县（备用）
                if (!district && detail) {
                    const match = detail.match(/([^市]+[市区县])/g);
                    if (match && match.length > 0) {
                        const last = match[match.length - 1];
                        if (last.includes('区') || last.includes('县')) {
                            district = last;
                            console.log('从详细地址提取区县：', district);
                        }
                    }
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

    // 省份匹配
    let provMatched = false;
    if (provSelect && province) {
        provMatched = matchText(provSelect, province, '省份');
        if (!provMatched && municipalities.includes(province)) {
            const shortName = province.replace(/[市]$/, '');
            for (let opt of provSelect.options) {
                if (opt.text.includes(shortName)) {
                    provSelect.value = opt.value;
                    console.log(`直辖市模糊匹配成功：${province} -> ${opt.text}`);
                    provMatched = true;
                    break;
                }
            }
        }
    }
    if (provSelect) provSelect.dispatchEvent(new Event('change'));

    // 判断是否为直辖市
    const isMunicipality = province && municipalities.includes(province);

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
            if (district) matchText(distSelect, district, '区县');
            else console.warn('区县名称为空');
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
                        console.log('直辖市自动选择城市（市辖区）：', opt.text);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // 如果没有“市辖区”，则选择第一个非空选项（比如可能叫“重庆城区”等）
                    console.warn('未找到“市辖区”选项，尝试选择第一个选项');
                    if (citySelect.options.length > 1) {
                        citySelect.value = citySelect.options[1].value;
                    } else {
                        citySelect.value = '';
                    }
                }
            } else {
                // 县：尝试选择文本包含“县”的选项
                console.log('直辖市县，尝试选择包含“县”的城市选项');
                let found = false;
                for (let opt of citySelect.options) {
                    if (opt.text.includes('县')) {
                        citySelect.value = opt.value;
                        console.log('直辖市自动选择城市（县）：', opt.text);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    console.warn('未找到包含“县”的城市选项，城市留空');
                    citySelect.value = '';
                }
            }
            citySelect.dispatchEvent(new Event('change'));
        }
        setTimeout(waitForDistrict, 300);
    } else {
        // 非直辖市：先匹配城市，再匹配区县
        waitForCity(() => {
            if (city) matchText(citySelect, city, '城市');
            citySelect.dispatchEvent(new Event('change'));
            setTimeout(waitForDistrict, 300);
        });
    }

    if (detailInput) detailInput.value = detail;
}

function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) return;

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
        console.log('搜索地址：', address);
        geocoder.getPoint(address, function(result) {
            console.log('搜索结果：', result);
            if (!result || (result.status !== '0' && result.status !== 0)) {
                alert('未找到该地址');
                return;
            }

            clearMarkers();

            let poiList = [];
            if (result.poiList && Array.isArray(result.poiList)) {
                poiList = result.poiList;
            } else if (result.resultList && Array.isArray(result.resultList)) {
                poiList = result.resultList;
            } else if (result.location) {
                poiList = [result];
            }

            if (poiList.length === 0) {
                alert('未找到相关地址');
                return;
            }

            console.log('找到结果数：', poiList.length);

            poiList.forEach((poi, index) => {
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
                } else {
                    console.warn('无法获取坐标，跳过该结果', poi);
                    return;
                }

                const lnglat = new T.LngLat(parseFloat(lon), parseFloat(lat));
                const marker = new T.Marker(lnglat);
                marker.setTitle(poi.name || poi.formatted_address || '位置');

                marker.addEventListener('click', function() {
                    let province = '', city = '', district = '', detail = '';
                    if (poi.addressComponent) {
                        province = poi.addressComponent.province || '';
                        city = poi.addressComponent.city || '';
                        district = poi.addressComponent.district || poi.addressComponent.County || '';
                    }
                    if (poi.formatted_address) {
                        detail = poi.formatted_address;
                    } else if (poi.address) {
                        detail = poi.address;
                    } else if (poi.name) {
                        detail = poi.name;
                    }

                    // 直辖市补全
                    if (!province) {
                        if (detail.includes('重庆市')) province = '重庆市';
                        else if (detail.includes('北京市')) province = '北京市';
                        else if (detail.includes('天津市')) province = '天津市';
                        else if (detail.includes('上海市')) province = '上海市';
                    }

                    // 区县提取
                    if (!district && detail) {
                        const match = detail.match(/([^市]+[市区县])/g);
                        if (match && match.length > 0) {
                            district = match[match.length - 1];
                        }
                    }

                    fillAddressToForm(currentFormId, province, city, district, detail);
                    document.getElementById('mapModal').style.display = 'none';
                });

                map.addOverlay(marker);
                currentMarkers.push(marker);

                if (index === 0) {
                    map.panTo(lnglat);
                    map.setZoom(14);
                }
            });

            alert(`找到 ${poiList.length} 个结果，请点击地图上的标记选择地址`);
        });
    });
}

function bindLocate() {
    const locateBtn = document.getElementById('locateBtn');
    if (!locateBtn) return;

    locateBtn.replaceWith(locateBtn.cloneNode(true));
    const newLocateBtn = document.getElementById('locateBtn');

    newLocateBtn.addEventListener('click', function() {
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
                clearMarkers();

                const marker = new T.Marker(point);
                marker.setTitle('当前位置');
                marker.addEventListener('click', function() {
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
                                let district = comp.district || comp.County || '';
                                if (!province) {
                                    if (city.includes('北京') || city.includes('天津') || city.includes('上海') || city.includes('重庆')) {
                                        province = city;
                                    } else if (detail.includes('重庆市')) province = '重庆市';
                                    else if (detail.includes('北京市')) province = '北京市';
                                    else if (detail.includes('天津市')) province = '天津市';
                                    else if (detail.includes('上海市')) province = '上海市';
                                }
                                if (!district && detail) {
                                    const match = detail.match(/([^市]+[市区县])/g);
                                    if (match && match.length > 0) {
                                        district = match[match.length - 1];
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
                    document.getElementById('mapModal').style.display = 'none';
                });
                map.addOverlay(marker);
                currentMarkers.push(marker);
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