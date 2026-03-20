// functions/submit.js
// 处理 POST 请求到 /submit 路径，存储数据到 KV 并添加北京时间

export async function onRequestPost(context) {
    const { request, env } = context;

    // 处理 CORS 预检请求（OPTIONS）
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    try {
        // 解析前端发送的 JSON 数据
        const data = await request.json();
        console.log('收到提交数据:', data);

        // 验证必填字段（可根据实际需求调整）
        if (!data.shopName || !data.contactName || !data.contactPhone || !data.detailAddress) {
            return new Response(JSON.stringify({
                code: 1,
                message: '缺少必填字段'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 生成唯一键：时间戳 + 随机数
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const key = `sub_${timestamp}_${random}`;

        // 获取北京时间（格式：YYYY-MM-DD HH:MM:SS）
        const beijingTime = new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-');  // 将日期分隔符从 / 替换为 -，得到 "2026-03-20 10:07:06"

        // 准备存储的数据（包含原始 UTC 时间和北京时间）
        const storeData = {
            ...data,
            utcTime: new Date().toISOString(),      // 原始 UTC 时间（可选）
            beijingTime: beijingTime,                // 北京时间
            storedAt: new Date().toISOString(),
            receivedAt: timestamp
        };

        // 检查 KV 绑定是否可用
        if (!env.SUBMISSIONS_KV) {
            console.error('KV 绑定未找到，请检查变量名是否为 SUBMISSIONS_KV');
            return new Response(JSON.stringify({
                code: 1,
                message: '服务器配置错误：KV 绑定未找到'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 将数据存入 KV
        await env.SUBMISSIONS_KV.put(key, JSON.stringify(storeData));
        console.log('数据已存储，key:', key, '北京时间:', beijingTime);

        // 返回成功响应
        return new Response(JSON.stringify({
            code: 0,
            message: '提交成功',
            key: key
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('处理请求时出错：', error);
        return new Response(JSON.stringify({
            code: 1,
            message: '服务器内部错误',
            error: error.toString()
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}