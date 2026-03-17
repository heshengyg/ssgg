// tianmap.js (简化调试版)
let map = null;
let currentFormId = null;
let isClickBound = false;

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
            console.error('地图初始化失败', e);
            alert('地图加载失败，刷新重试');
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
    // 与之前相同，省略以保持简洁，实际代码请保留原函数内容
    // ...（从之前的完整版中保留此函数）
}

function bindSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchAddress');
    if (!searchBtn || !searchInput) {
        console.error('搜索元素未找到');
        return;
    }

    // 移除所有已绑定的监听器（用新按钮替换旧按钮）
    const newBtn = searchBtn.cloneNode(true);
    searchBtn.parentNode.replaceChild(newBtn, searchBtn);

    newBtn.addEventListener('click', function() {
        console.log('搜索按钮被点击');
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
            if (!result || (result.status !== '0' && result.status !== 0)) {
                alert('未找到该地址');
                return;
            }

            // 提取坐标
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

            // 清除旧标记
            map.clearOverlays();

            // 添加新标记
            const marker = new T.Marker(point);
            map.addOverlay(marker);

            // 地图移动到该点并缩放
            map.panTo(point);
            map.setZoom(15);

            // 直接填充地址信息（如果有）
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

            // 可自动关闭弹窗？建议让用户自己确认
            // document.getElementById('mapModal').style.display = 'none';
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
console.log('天地图API版本：', T?.version);