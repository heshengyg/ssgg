// functions/submit.js
// 处理 POST 请求到 /submit 路径

/**
 * 处理 POST 请求
 * @param {Object} context - 函数上下文，包含 request 和 env
 * @returns {Response} - 返回给前端的响应
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    // 1. 处理 CORS 预检请求（如果需要）
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
        // 2. 解析前端发送的 JSON 数据
        const data = await request.json();
        console.log('收到提交数据:', data);

        // 3. 验证必填字段
        if (!data.shopName || !data.contactName || !data.contactPhone || !data.detailAddress) {
            return new Response(JSON.stringify({
                code: 1,
                message: '缺少必填字段'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 4. 生成唯一键并准备存储数据
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const key = `sub_${timestamp}_${random}`;

        const storeData = {
            ...data,
            storedAt: new Date().toISOString(),
            receivedAt: timestamp
        };

        // 5. 检查 KV 绑定是否可用
        if (!env.SUBMISSIONS_KV) {
            console.error('KV 绑定未找到');
            return new Response(JSON.stringify({
                code: 1,
                message: '服务器配置错误'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 6. 将数据存入 KV
        await env.SUBMISSIONS_KV.put(key, JSON.stringify(storeData));
        console.log('数据已存储，key:', key);

        // 7. 返回成功响应
        return new Response(JSON.stringify({
            code: 0,
            message: '提交成功'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        // 8. 错误处理
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