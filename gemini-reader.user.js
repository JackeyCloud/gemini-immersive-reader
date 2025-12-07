// ==UserScript==
// @name         Gemini 沉浸式阅读伴侣 | Immersive Reader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @license      All Rights Reserved
// @description  提供类似“微信读书”的沉浸式阅读体验：羊皮纸/护眼绿主题、思源宋体、自动保存设置、全页面视觉降噪。让 AI 阅读回归本质。
// @author       Jackey（有问题联系我，微信：ui1945)
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 资源加载 ---
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://npm.elemecdn.com/lxgw-wenkai-screen-web/style.css';
    document.head.appendChild(fontLink);

    // --- 2. 配置管理 ---
    const defaultConfig = {
        theme: 'yellow',      // 默认主题
        fontType: 'serif',    // 默认字体
        fontSize: 19,
        maxWidth: 900,
        hideFooter: true,
        publicStyle: false,   // 公众号风格开关
        publicColor: 'yellow',// 高亮色
        publicType: 'half'    // 高亮类型: 'half' | 'full'
    };
    // 深度合并配置，防止新字段丢失
    let stored = JSON.parse(localStorage.getItem('gemini_reader_config') || '{}');
    let config = { ...defaultConfig, ...stored };
    // 强制检查 publicType，防止旧版本升级导致的 undefined
    if (!config.publicType) config.publicType = 'half';

    // --- 3. 核心样式 (CSS Variables) ---
    const css = `
        :root {
            /* === 基础变量 === */
            --w-bg: #fff;
            --w-text: #333;
            --w-font: "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif;

            /* 撞色变量 */
            --w-accent-bg: #fff;
            --w-accent-text: #333;
            --w-sidebar-text: #000;
            --w-input-bg: #fff;

            --w-footer-display: none;
            --w-input-radius: 28px;

            /* 公众号风格变量 (默认值) */
            --w-pub-high: rgba(255, 235, 59, 0.6); /* 高亮底色 */
            --w-pub-accent: #fbe204; /* 标题装饰色 */
            --w-pub-text-on-high: inherit; /* 高亮上的文字颜色 */
        }

        /* === 1. 基因锁破解 (Root Injection) === */
        :root, body, .theme-host, :where(.theme-host) {
            --bard-color-synthetic--chat-window-surface: var(--w-bg) !important;
            --gem-sys-color--surface: var(--w-bg) !important;
            --gem-sys-color--surface-variant: var(--w-bg) !important;
            --gem-sys-color--surface-container: var(--w-bg) !important;
            --gem-sys-color--surface-container-high: var(--w-bg) !important;
            --gem-sys-color--surface-container-low: var(--w-bg) !important;

            background-color: var(--w-bg) !important;
            color: var(--w-text) !important;
        }

        /* === 2. 容器透明化 === */
        gemini-app, main, infinite-scroller,
        .conversation-container, .response-container, .inner-container,
        .scroll-container, .input-area-container, .mat-drawer-container,
        mat-sidenav, .mat-drawer, .mat-drawer-inner-container,
        .chat-history, .explore-gems-container, conversations-list, bot-list,
        .overflow-container, mat-action-list, mat-nav-list,
        .conversation-items-container, side-nav-action-button,
        bard-sidenav, input-container
        {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* === 3. 输入框修复 === */
        .input-gradient, input-container.input-gradient {
            background: transparent !important;
            pointer-events: auto !important;
        }
        .top-gradient-container,
        .scroll-container::after,
        .scroll-container::before {
            display: none !important;
        }
        .input-area-container {
            padding-bottom: 40px !important;
            margin-bottom: 10px !important;
        }

        /* === 4. 输入框美化 === */
        .input-area {
            border-radius: 32px !important;
            background-color: var(--w-input-bg) !important;
            border: 1px solid rgba(0,0,0,0.08) !important;
            overflow: hidden !important;
            transition: background-color 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
        }
        .text-input-field, .ql-editor, .ql-container {
            border-radius: 0 !important;
            background: transparent !important;
            border: none !important;
        }

        /* === 5. 侧边栏深度净化 === */
        bard-sidenav .bot-new-conversation-button,
        bard-sidenav .mat-mdc-list-item-interactive,
        bard-sidenav button {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }
        bard-sidenav .bot-new-conversation-button:hover,
        bard-sidenav .mat-mdc-list-item-interactive:hover {
            background-color: rgba(0,0,0,0.05) !important;
            border-radius: 12px !important;
        }
        bard-sidenav .conversation.selected {
            background-color: var(--w-accent-bg) !important;
            border-radius: 12px !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.03) !important;
        }
        bard-sidenav, bard-sidenav span, bard-sidenav mat-icon,
        .conversation-title, .bot-name, .gds-body-m {
            color: var(--w-sidebar-text) !important;
        }

        /* === 6. 撞色设计 (内容区) === */
        .user-query-bubble-with-background,
        .user-query-container .query-content {
            background-color: var(--w-accent-bg) !important;
            color: var(--w-accent-text) !important;
            border-radius: 16px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
            border: 1px solid rgba(0,0,0,0.03) !important;
        }
        code, .code-container, pre {
            background-color: var(--w-accent-bg) !important;
            color: var(--w-text) !important;
            border-radius: 12px !important;
            font-family: "JetBrains Mono", Consolas, monospace !important;
            border: 1px solid rgba(0,0,0,0.05) !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.03) !important;
        }

        /* === 7. 排版细节 === */
        body, p, li, h1, h2, h3, div, span, button, input {
            font-family: var(--w-font) !important;
        }
        main p, .model-response-text p {
            font-size: ${config.fontSize}px !important;
            line-height: 1.8 !important;
            text-align: justify !important;
            margin-bottom: 1.5em !important;
            color: var(--w-text) !important;
        }

        /* 修复：深色模式下 H3 和列表点看不见的问题 */
        body[data-theme="dark"] h3,
        body[data-theme="dark"] ul,
        body[data-theme="dark"] ol,
        body[data-theme="dark"] li::marker {
            color: #e0e0e0 !important;
        }

        hallucination-disclaimer, .hallucination-disclaimer, .footer-container {
            display: var(--w-footer-display) !important;
            opacity: 0.3;
        }
        .conversation-container, .response-container, .inner-container {
            max-width: ${config.maxWidth}px !important;
            margin: 0 auto !important;
        }

        /* === 8. 智能配色逻辑 (变量定义) === */
        /* 通过 body 属性动态改变 CSS 变量 */

        /* Style: Yellow */
        body[data-pub-color="yellow"] { --w-pub-high: rgba(255, 235, 59, 0.6); --w-pub-accent: #fbc02d; --w-pub-text-on-high: #000; }
        body[data-theme="green"][data-pub-color="yellow"] { --w-pub-high: rgba(255, 215, 0, 0.6); --w-pub-accent: #f57f17; }
        body[data-theme="dark"][data-pub-color="yellow"] { --w-pub-high: rgba(255, 235, 59, 0.4); --w-pub-accent: #fff176; --w-pub-text-on-high: #fff; }

        /* Style: Blue */
        body[data-pub-color="blue"] { --w-pub-high: rgba(144, 202, 249, 0.6); --w-pub-accent: #1976d2; --w-pub-text-on-high: #000; }
        body[data-theme="green"][data-pub-color="blue"] { --w-pub-high: rgba(33, 150, 243, 0.4); --w-pub-accent: #1565c0; }
        body[data-theme="dark"][data-pub-color="blue"] { --w-pub-high: rgba(66, 165, 245, 0.4); --w-pub-accent: #90caf9; --w-pub-text-on-high: #fff; }

        /* Style: Pink */
        body[data-pub-color="pink"] { --w-pub-high: rgba(244, 143, 177, 0.6); --w-pub-accent: #d81b60; --w-pub-text-on-high: #000; }
        body[data-theme="green"][data-pub-color="pink"] { --w-pub-high: rgba(233, 30, 99, 0.3); --w-pub-accent: #ad1457; }
        body[data-theme="dark"][data-pub-color="pink"] { --w-pub-high: rgba(240, 98, 146, 0.4); --w-pub-accent: #f48fb1; --w-pub-text-on-high: #fff; }

        /* Style: Green */
        body[data-pub-color="green"] { --w-pub-high: rgba(165, 214, 167, 0.6); --w-pub-accent: #388e3c; --w-pub-text-on-high: #000; }
        body[data-theme="green"][data-pub-color="green"] { --w-pub-high: rgba(255, 255, 255, 0.5); --w-pub-accent: #2e7d32; }
        body[data-theme="dark"][data-pub-color="green"] { --w-pub-high: rgba(129, 199, 132, 0.4); --w-pub-accent: #a5d6a7; --w-pub-text-on-high: #fff; }


        /* === 9. 公众号排版风格实现 (修复版) === */

        /* 标题样式 */
        body[data-public-style="true"] main h1,
        body[data-public-style="true"] .model-response-text h1,
        body[data-public-style="true"] main h2,
        body[data-public-style="true"] .model-response-text h2 {
            border-left: 5px solid var(--w-pub-accent) !important;
            background: linear-gradient(to right, rgba(0,0,0,0.03), transparent) !important;
            padding: 10px 15px !important;
            border-radius: 0 8px 8px 0 !important;
            margin-top: 30px !important;
            margin-bottom: 20px !important;
            font-weight: bold !important;
            color: inherit !important;
        }
        body[data-theme="dark"][data-public-style="true"] main h2 {
            background: linear-gradient(to right, rgba(255,255,255,0.05), transparent) !important;
        }

        /* --- 荧光笔高亮 (修复：增加 !important 确保生效) --- */
        body[data-public-style="true"] main strong,
        body[data-public-style="true"] main b,
        body[data-public-style="true"] .model-response-text strong,
        body[data-public-style="true"] .model-response-text b {
            padding: 0 3px !important;
            border-radius: 4px !important;
            color: inherit !important;
            background: none; /* 重置背景，由下面覆盖 */
        }

        /* 模式 A：半覆盖 (下划线风格) */
        body[data-public-style="true"][data-pub-type="half"] main strong,
        body[data-public-style="true"][data-pub-type="half"] main b,
        body[data-public-style="true"][data-pub-type="half"] .model-response-text strong,
        body[data-public-style="true"][data-pub-type="half"] .model-response-text b {
            background: linear-gradient(to bottom, transparent 55%, var(--w-pub-high) 0) !important;
        }

        /* 模式 B：全覆盖 (荧光笔风格) */
        body[data-public-style="true"][data-pub-type="full"] main strong,
        body[data-public-style="true"][data-pub-type="full"] main b,
        body[data-public-style="true"][data-pub-type="full"] .model-response-text strong,
        body[data-public-style="true"][data-pub-type="full"] .model-response-text b {
            background-color: var(--w-pub-high) !important;
            color: var(--w-pub-text-on-high) !important;
        }

        /* 引用卡片 */
        body[data-public-style="true"] main blockquote,
        body[data-public-style="true"] .model-response-text blockquote {
            background-color: rgba(0,0,0,0.03) !important;
            border-left: 4px solid var(--w-pub-accent) !important;
            padding: 15px !important;
            border-radius: 8px !important;
            margin: 20px 0 !important;
        }
        body[data-theme="dark"][data-public-style="true"] main blockquote {
            background-color: rgba(255,255,255,0.05) !important;
        }

        /* 列表容器 */
        body[data-public-style="true"] main ul,
        body[data-public-style="true"] main ol,
        body[data-public-style="true"] .model-response-text ul,
        body[data-public-style="true"] .model-response-text ol {
            background: rgba(0,0,0,0.02) !important;
            padding: 15px 15px 15px 35px !important;
            border-radius: 10px !important;
            border: 1px dashed rgba(0,0,0,0.1) !important;
            margin-bottom: 20px !important;
        }
        body[data-theme="dark"][data-public-style="true"] main ul {
            background: rgba(255,255,255,0.03) !important;
            border-color: rgba(255,255,255,0.1) !important;
        }


        /* === UI: 悬浮球 & 设置面板 === */
        #wx-fab { position: fixed; bottom: 80px; right: 30px; width: 44px; height: 44px; background: #333; color: #fff; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; cursor: move; z-index: 999999; font-size: 20px; user-select: none; transition: opacity 0.3s; opacity: 0.4; }
        #wx-fab:hover { opacity: 1; transform: scale(1.1); }
        #wx-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 380px; background: #fff; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); padding: 25px; z-index: 1000000; display: none; flex-direction: column; gap: 20px; font-family: system-ui, -apple-system, sans-serif !important; color: #333; }
        #wx-panel.active { display: flex; }
        #wx-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999999; display: none; backdrop-filter: blur(2px); }
        #wx-overlay.active { display: block; }
        .wx-row-label { font-size: 14px; color: #888; margin-bottom: 8px; }
        .wx-flex-row { display: flex; gap: 10px; align-items: center; }
        .wx-color-btn { flex: 1; height: 40px; border-radius: 10px; cursor: pointer; border: 2px solid transparent; }
        .wx-color-btn.active { border-color: #333; transform: scale(0.95); }
        .wx-font-btn { flex: 1; padding: 10px 0; text-align: center; background: #f5f5f5; border-radius: 12px; font-size: 13px; cursor: pointer; color: #333; }
        .wx-font-btn.active { background: #333; color: #fff; }
        .wx-num-input { width: 50px; padding: 5px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
        input[type=range] { flex: 1; accent-color: #333; }
        .wx-switch-row { display: flex; justify-content: space-between; align-items: center; margin-top: 5px; }

        /* 样式选择圆点 */
        .wx-style-dot { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: transform 0.2s; position: relative; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .wx-style-dot:hover { transform: scale(1.1); }
        .wx-style-dot.active { border-color: #333; transform: scale(1.1); }
        /* 隐藏样式行 */
        #wx-style-row { display: none; margin-top: 10px; padding-left: 5px; gap: 15px; align-items: center; justify-content: space-between;}
        #wx-style-row.visible { display: flex; animation: fadeIn 0.3s; }

        /* 全覆盖/半覆盖 切换按钮 */
        .wx-type-switch { display: flex; background: #f0f0f0; border-radius: 15px; padding: 2px; }
        .wx-type-btn { padding: 4px 12px; font-size: 12px; cursor: pointer; border-radius: 12px; color: #666; transition: all 0.2s;}
        .wx-type-btn.active { background: #fff; color: #000; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: bold; }

        @keyframes fadeIn { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }
    `;
    GM_addStyle(css);

    // --- 4. 辅助函数 ---
    function createEl(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }

    // --- 5. UI 构建 ---
    function buildPanel() {
        if (document.getElementById('wx-panel')) return;
        const overlay = createEl('div'); overlay.id = 'wx-overlay'; overlay.onclick = closePanel; document.body.appendChild(overlay);
        const panel = createEl('div'); panel.id = 'wx-panel'; document.body.appendChild(panel);
        const closeBtn = createEl('div', null, '✕'); closeBtn.style.cssText = "position:absolute; top:20px; right:20px; cursor:pointer; font-weight:bold; color:#ccc; font-size:18px;"; closeBtn.onclick = closePanel; panel.appendChild(closeBtn);

        // 背景
        const row1 = createEl('div'); row1.appendChild(createEl('div', 'wx-row-label', '背景主题'));
        const colorContainer = createEl('div', 'wx-flex-row');
        const colors = [ { id: 'white', bg: '#fff', border: '1px solid #eee' }, { id: 'yellow', bg: '#f6f1e7' }, { id: 'green', bg: '#cce8cf' }, { id: 'dark', bg: '#222' } ];
        colors.forEach(c => { const btn = createEl('div', 'wx-color-btn'); btn.style.background = c.bg; if(c.border) btn.style.border = c.border; btn.dataset.val = c.id; btn.onclick = () => { config.theme = c.id; applyConfig(); updateUIState(); }; colorContainer.appendChild(btn); });
        row1.appendChild(colorContainer); panel.appendChild(row1);

        // 字号
        const row2 = createEl('div'); row2.appendChild(createEl('div', 'wx-row-label', '字体大小 (px)'));
        const fontRow = createEl('div', 'wx-flex-row');
        const slider = createEl('input'); slider.type = 'range'; slider.min = 14; slider.max = 30; slider.step = 1; slider.value = config.fontSize; slider.id = 'wx-fs-slider';
        const numInput = createEl('input', 'wx-num-input'); numInput.type = 'number'; numInput.value = config.fontSize; numInput.id = 'wx-fs-input';
        slider.oninput = (e) => { config.fontSize = parseInt(e.target.value); numInput.value = config.fontSize; applyConfig(); };
        numInput.oninput = (e) => { let val = parseInt(e.target.value); if(val){ config.fontSize = val; slider.value = val; applyConfig(); }};
        fontRow.appendChild(createEl('span', null, 'A-')); fontRow.appendChild(slider); fontRow.appendChild(createEl('span', null, 'A+')); fontRow.appendChild(numInput);
        row2.appendChild(fontRow); panel.appendChild(row2);

        // 宽度
        const row4 = createEl('div'); row4.appendChild(createEl('div', 'wx-row-label', '阅读宽度 (px)'));
        const widthRow = createEl('div', 'wx-flex-row');
        const wSlider = createEl('input'); wSlider.type = 'range'; wSlider.min = 600; wSlider.max = 1600; wSlider.step = 50; wSlider.value = config.maxWidth; wSlider.id = 'wx-wd-slider';
        const wInput = createEl('input', 'wx-num-input'); wInput.type = 'number'; wInput.value = config.maxWidth; wInput.id = 'wx-wd-input';
        wSlider.oninput = (e) => { config.maxWidth = parseInt(e.target.value); wInput.value = config.maxWidth; applyConfig(); };
        wInput.oninput = (e) => { let val = parseInt(e.target.value); if(val){ config.maxWidth = val; wSlider.value = val; applyConfig(); }};
        widthRow.appendChild(createEl('span', null, '窄')); widthRow.appendChild(wSlider); widthRow.appendChild(createEl('span', null, '宽')); widthRow.appendChild(wInput);
        row4.appendChild(widthRow); panel.appendChild(row4);

        // 字体
        const row3 = createEl('div'); row3.appendChild(createEl('div', 'wx-row-label', '字体风格'));
        const fontContainer = createEl('div', 'wx-flex-row');
        const fonts = [ { id: 'sans', name: '思源黑体' }, { id: 'serif', name: '思源宋体' }, { id: 'wenkai', name: '霞鹜文楷' } ];
        fonts.forEach(f => { const btn = createEl('div', 'wx-font-btn', f.name); btn.dataset.val = f.id; btn.onclick = () => { config.fontType = f.id; applyConfig(); updateUIState(); }; fontContainer.appendChild(btn); });
        row3.appendChild(fontContainer); panel.appendChild(row3);

        // 底部开关
        const row6 = createEl('div', 'wx-switch-row'); row6.appendChild(createEl('span', null, '隐藏底部免责声明'));
        const footerCheck = createEl('input'); footerCheck.type = 'checkbox'; footerCheck.id = 'wx-footer-check'; footerCheck.checked = config.hideFooter;
        footerCheck.onchange = (e) => { config.hideFooter = e.target.checked; applyConfig(); };
        row6.appendChild(footerCheck); panel.appendChild(row6);

        // 公众号风格开关
        const row7 = createEl('div', 'wx-switch-row'); row7.appendChild(createEl('span', null, '公众号排版风格'));
        const publicCheck = createEl('input'); publicCheck.type = 'checkbox'; publicCheck.id = 'wx-public-check'; publicCheck.checked = config.publicStyle;
        publicCheck.onchange = (e) => { config.publicStyle = e.target.checked; applyConfig(); updateUIState(); };
        row7.appendChild(publicCheck); panel.appendChild(row7);

        // --- 样式自定义行 (颜色 + 类型) ---
        const rowStyle = createEl('div'); rowStyle.id = 'wx-style-row';

        // 1. 颜色选择区
        const colorZone = createEl('div', 'wx-flex-row');
        colorZone.style.gap = '8px';
        const styles = [
            { id: 'yellow', bg: '#fdd835' },
            { id: 'blue',   bg: '#64b5f6' },
            { id: 'pink',   bg: '#f06292' },
            { id: 'green',  bg: '#81c784' }
        ];
        styles.forEach(s => {
            const dot = createEl('div', 'wx-style-dot');
            dot.style.backgroundColor = s.bg;
            dot.dataset.val = s.id;
            dot.title = "选择高亮颜色";
            dot.onclick = () => { config.publicColor = s.id; applyConfig(); updateUIState(); };
            colorZone.appendChild(dot);
        });

        // 2. 类型切换区 (半覆盖/全覆盖)
        const typeSwitch = createEl('div', 'wx-type-switch');
        const typeHalf = createEl('div', 'wx-type-btn', '半覆盖');
        typeHalf.dataset.val = 'half';
        typeHalf.onclick = () => { config.publicType = 'half'; applyConfig(); updateUIState(); };

        const typeFull = createEl('div', 'wx-type-btn', '全覆盖');
        typeFull.dataset.val = 'full';
        typeFull.onclick = () => { config.publicType = 'full'; applyConfig(); updateUIState(); };

        typeSwitch.appendChild(typeHalf);
        typeSwitch.appendChild(typeFull);

        rowStyle.appendChild(colorZone);
        rowStyle.appendChild(typeSwitch);
        panel.appendChild(rowStyle);

        updateUIState();
    }

    // --- 6. 悬浮球 ---
    function createFab() { if(document.getElementById('wx-fab')) return; const fab = createEl('div'); fab.id = 'wx-fab'; fab.textContent = '⚙️'; fab.title = '阅读设置'; let isDragging = false, startX, startY, initialLeft, initialTop; fab.onmousedown = (e) => { isDragging = false; startX = e.clientX; startY = e.clientY; initialLeft = fab.offsetLeft; initialTop = fab.offsetTop; document.onmousemove = onMouseMove; document.onmouseup = onMouseUp; }; function onMouseMove(e) { if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) { isDragging = true; fab.style.left = (initialLeft + e.clientX - startX) + 'px'; fab.style.top = (initialTop + e.clientY - startY) + 'px'; fab.style.bottom = 'auto'; fab.style.right = 'auto'; } } function onMouseUp(e) { document.onmousemove = null; document.onmouseup = null; if (!isDragging) openPanel(); } document.body.appendChild(fab); }

    // --- 7. 调色盘 ---
    const fontStacks = {
        sans: '"Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        serif: '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif',
        wenkai: '"LXGW WenKai Screen Web", "KaiTi", "STKaiti", serif'
    };

    const themes = {
        white:  {
            bg: '#ffffff', text: '#333333',
            accentBg: '#f7f7f7', accentText: '#333',
            inputBg: '#ffffff', sidebarText: '#000000'
        },
        yellow: {
            bg: '#f6f1e7', text: '#5b4636',
            accentBg: '#ffffff', accentText: '#4a3b2f',
            inputBg: '#ffffff', sidebarText: '#000000'
        },
        green:  {
            bg: '#cce8cf', text: '#222222',
            accentBg: '#ffffff', accentText: '#1f3322',
            inputBg: '#ffffff', sidebarText: '#000000'
        },
        dark:   {
            bg: '#1a1a1a', text: '#bfbfbf',
            accentBg: '#2d2d2d', accentText: '#e0e0e0',
            inputBg: '#2a2a2a', sidebarText: '#ffffff'
        }
    };

    function applyConfig() {
        const root = document.documentElement;
        const t = themes[config.theme];
        root.style.setProperty('--w-bg', t.bg);
        root.style.setProperty('--w-text', t.text);
        root.style.setProperty('--w-accent-bg', t.accentBg);
        root.style.setProperty('--w-accent-text', t.accentText);
        root.style.setProperty('--w-input-bg', t.inputBg);
        root.style.setProperty('--w-sidebar-text', t.sidebarText);
        root.style.setProperty('--w-font', fontStacks[config.fontType]);
        root.style.setProperty('--w-footer-display', config.hideFooter ? 'none' : 'block');

        // 应用公众号标记 & 颜色标记 & 类型标记
        document.body.setAttribute('data-public-style', config.publicStyle);
        document.body.setAttribute('data-pub-color', config.publicColor);
        document.body.setAttribute('data-pub-type', config.publicType);

        if (config.theme === 'dark') document.body.setAttribute('data-theme', 'dark');
        else if (config.theme === 'green') document.body.setAttribute('data-theme', 'green');
        else document.body.setAttribute('data-theme', 'light');

        GM_addStyle(`
            main p, .model-response-text p { font-size: ${config.fontSize}px !important; }
            .conversation-container, .response-container, .inner-container { max-width: ${config.maxWidth}px !important; }
        `);

        localStorage.setItem('gemini_reader_config', JSON.stringify(config));
    }

    function updateUIState() {
        const panel = document.getElementById('wx-panel'); if (!panel) return;
        panel.querySelectorAll('.wx-color-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.val === config.theme));
        panel.querySelectorAll('.wx-font-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.val === config.fontType));
        document.getElementById('wx-fs-slider').value = config.fontSize; document.getElementById('wx-fs-input').value = config.fontSize;
        document.getElementById('wx-wd-slider').value = config.maxWidth; document.getElementById('wx-wd-input').value = config.maxWidth;
        document.getElementById('wx-footer-check').checked = config.hideFooter;

        // 公众号开关逻辑
        document.getElementById('wx-public-check').checked = config.publicStyle;
        const styleRow = document.getElementById('wx-style-row');
        if (config.publicStyle) {
            styleRow.classList.add('visible');
        } else {
            styleRow.classList.remove('visible');
        }

        // 样式圆点选中态
        panel.querySelectorAll('.wx-style-dot').forEach(dot => dot.classList.toggle('active', dot.dataset.val === config.publicColor));

        // 全覆盖/半覆盖选中态
        panel.querySelectorAll('.wx-type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.val === config.publicType));
    }

    function openPanel() { buildPanel(); document.getElementById('wx-overlay').classList.add('active'); document.getElementById('wx-panel').classList.add('active'); updateUIState(); }
    function closePanel() { document.getElementById('wx-overlay').classList.remove('active'); document.getElementById('wx-panel').classList.remove('active'); }

    setTimeout(() => { applyConfig(); createFab(); console.log('Gemini Reader Loaded.'); }, 1000);

})();
