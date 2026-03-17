\# 松鼠逛逛 · 社区生活服务平台



\## 本地运行

1\. 将整个文件夹放入 Web 服务器（或使用 VS Code Live Server 直接打开 index.html）。

2\. 确保 `data/` 目录下的 `news.json` 和 `areas.json` 格式正确。

3\. 如需修改天地图密钥，请在 `index.html` 中替换 `tk=YOUR\_KEY`。



\## 修改内容

\- \*\*平台要闻\*\*：编辑 `data/news.json`，按示例增加/删除/修改条目即可。

\- \*\*省市区数据\*\*：将您下载的标准数据整理成嵌套格式放入 `data/areas.json`。

\- \*\*联系方式\*\*：在 `index.html` 的 `#contact` 板块中直接修改文字。

\- \*\*平台简介\*\*：在 `index.html` 的 `#intro` 板块中修改文字。



\## 部署到 GitHub Pages

1\. 在 GitHub 创建仓库，将本文件夹所有内容上传。

2\. 开启 GitHub Pages 功能（选择 main 分支 / root 文件夹）。

3\. 访问 `https://你的用户名.github.io/仓库名/` 即可。

