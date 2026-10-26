// ==UserScript==
// @name         OG Pro
// @namespace    http://tampermonkey.net/
// @version      10.2
// @description  Professional auto bumper with optimized rendering, multi-language support (English, Spanish, Russian), custom time inputs, theme customization, and GitHub auto-update.
// @author       You
// @match        https://oguser.com/*
// @updateURL    https://raw.githubusercontent.com/notcni/og-pro/main/ogpro.user.js
// @downloadURL  https://raw.githubusercontent.com/notcni/og-pro/main/ogpro.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      discord.com
// @connect      discordapp.com
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    if (window.top !== window.self) return;

    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    let count = GM_getValue('OG_PRO_count', 1);
    let bumpMsg = GM_getValue('OG_PRO_bumpMsg', 'grinding x{count}');
    let awardNotifierActive = GM_getValue('OG_PRO_awardNotifier', false);
    let lastCheckedAwardTime = GM_getValue('OG_PRO_lastAwardCheck', Date.now());
    let currentLang = GM_getValue('OG_PRO_lang', 'en');

    let theme = GM_getValue('OG_PRO_theme', {
        bg: '#0c0c0e',
        stroke: '#27272a',
        buttons: '#3b82f6',
        text: '#f43f5e'
    });

    let cfg = GM_getValue('OG_PRO_cfg', {
        bumpCycle: '60m', bumpMin: '30s', bumpMax: '60s',
        eventCycle: '60m', eventMin: '30s', eventMax: '60s',
        webhook: ''
    });

    let state = GM_getValue('OG_PRO_state', {
        bumps: [],
        events: [],
        activeBumps: false,
        activeEvents: {},
        nextBumpRun: 0,
        nextEventRuns: {},
        completedBumps: [],
        completedEvents: {}
    });

    let queue = GM_getValue('OG_PRO_queue', []);

    let isProcessing = false;
    let delayEndTime = 0;
    let botStatusMsg = "System operational. Waiting for triggers...";

    // UI State
    let currentTab = 'links';
    let currentTabLinks = 'bumps';
    let isPanelOpen = false;
    let activeIframe = null;

    const translations = {
        en: {
            title: "OG Pro", linksTab: "Links", delayTab: "Times", settingsTab: "Settings", botTab: "Bot",
            bumpsSub: "Bumps", eventsSub: "Events", msgTemplate: "Message Template", addBump: "Add Thread to Bumps",
            createFolder: "Create Event Folder", bumpsConfig: "Bumps Configuration", eventsConfig: "Events Configuration",
            globalCycle: "Global Cycle (Ex: 120m, 2h)", smoothMin: "Smooth Min (Ex: 30s, 1m)", smoothMax: "Smooth Max (Ex: 60s, 2m)",
            saveSettings: "Save Settings", uiCustomization: "UI Customization", bgLabel: "Background",
            strokeLabel: "Stroke (Borders)", buttonsLabel: "Buttons / Tabs", textLabel: "Accents / Text",
            applyTheme: "Apply & Save Theme", controlPanel: "Control Panel", discordWebhook: "Discord Webhook",
            updateWebhook: "Update Webhook", languageLabel: "Language / Idioma / Язык", saveTimes: "Save Times",
            saveBumpCfg: "Save Config", folderMsg: "Folder Message", addLink: "Add Link", globalBumps: "BUMPS (Global)",
            awardNotifier: "Award Notifier", eventFolders: "Event Folders", noFolders: "No folders created.",
            urlAlreadyBump: "⚠️ This URL is already in Bumps.", urlAlreadyFolder: "⚠️ This URL is already inside this folder.",
            settingsSaved: "Settings saved successfully.", themeSaved: "Theme updated successfully.",
            timesSaved: "Times updated successfully.", webhookSaved: "Webhook updated."
        },
        es: {
            title: "OG Pro", linksTab: "Enlaces", delayTab: "Tiempos", settingsTab: "Ajustes", botTab: "Bot",
            bumpsSub: "Bumps", eventsSub: "Eventos", msgTemplate: "Plantilla de Mensaje", addBump: "Añadir Thread a Bumps",
            createFolder: "Crear Carpeta de Evento", bumpsConfig: "Configuración Bumps", eventsConfig: "Configuración Eventos",
            globalCycle: "Ciclo Global (Ej: 120m, 2h)", smoothMin: "Smooth Mín (Ej: 30s, 1m)", smoothMax: "Smooth Máx (Ej: 60s, 2m)",
            saveSettings: "Guardar Ajustes", uiCustomization: "Personalización de Interfaz", bgLabel: "Fondo",
            strokeLabel: "Bordes (Stroke)", buttonsLabel: "Botones / Pestañas", textLabel: "Acentos / Texto",
            applyTheme: "Aplicar y Guardar Tema", controlPanel: "Panel de Control", discordWebhook: "Webhook de Discord",
            updateWebhook: "Actualizar Webhook", languageLabel: "Idioma / Language / Язык", saveTimes: "Guardar Tiempos",
            saveBumpCfg: "Guardar Config", folderMsg: "Mensaje de Carpeta", addLink: "Añadir Link", globalBumps: "BUMPS (Global)",
            awardNotifier: "Notificador de Awards", eventFolders: "Carpetas de Eventos", noFolders: "No hay carpetas creadas.",
            urlAlreadyBump: "⚠️ Este enlace ya está en Bumps.", urlAlreadyFolder: "⚠️ Este enlace ya está dentro de esta carpeta.",
            settingsSaved: "Configuración guardada con éxito.", themeSaved: "Tema actualizado correctamente.",
            timesSaved: "Tiempos actualizados correctamente.", webhookSaved: "Webhook actualizado."
        },
        ru: {
            title: "OG Pro", linksTab: "Ссылки", delayTab: "Тайминги", settingsTab: "Настройки", botTab: "Бот",
            bumpsSub: "Бампы", eventsSub: "События", msgTemplate: "Шаблон сообщения", addBump: "Добавить тред в Бампы",
            createFolder: "Создать папку событий", bumpsConfig: "Конфигурация Бампов", eventsConfig: "Конфигурация Событий",
            globalCycle: "Глобальный цикл (Пример: 120m, 2h)", smoothMin: "Мин. задержка (Пример: 30s, 1m)", smoothMax: "Макс. задержка (Пример: 60s, 2m)",
            saveSettings: "Сохранить настройки", uiCustomization: "Кастомизация интерфейса", bgLabel: "Фон",
            strokeLabel: "Рамки (Stroke)", buttonsLabel: "Кнопки / Вкладки", textLabel: "Акценты / Текст",
            applyTheme: "Применить и сохранить тему", controlPanel: "Панель управления", discordWebhook: "Вебхук Discord",
            updateWebhook: "Обновить вебхук", languageLabel: "Язык / Language / Idioma", saveTimes: "Сохранить тайминги",
            saveBumpCfg: "Сохранить конфиг", folderMsg: "Сообщение папки", addLink: "Добавить ссылку", globalBumps: "БАМПЫ (Глобально)",
            awardNotifier: "Уведомлятор наград", eventFolders: "Папки событий", noFolders: "Папки не созданы.",
            urlAlreadyBump: "⚠️ Эта ссылка уже в Бампах.", urlAlreadyFolder: "⚠️ Эта ссылка уже находится в этой папке.",
            settingsSaved: "Настройки успешно сохранены.", themeSaved: "Тема успешно обновлена.",
            timesSaved: "Тайминги успешно обновлены.", webhookSaved: "Вебхук обновлен."
        }
    };

    function t(key) {
        return translations[currentLang][key] || translations['en'][key] || key;
    }

    function saveAll() {
        GM_setValue('OG_PRO_cfg', cfg);
        GM_setValue('OG_PRO_state', state);
        GM_setValue('OG_PRO_queue', queue);
        GM_setValue('OG_PRO_count', count);
        GM_setValue('OG_PRO_bumpMsg', bumpMsg);
        GM_setValue('OG_PRO_awardNotifier', awardNotifierActive);
        GM_setValue('OG_PRO_lastAwardCheck', lastCheckedAwardTime);
        GM_setValue('OG_PRO_theme', theme);
        GM_setValue('OG_PRO_lang', currentLang);
    }

    function parseTimeToMs(str) {
        if (!str) return 60000;
        str = str.toString().trim().toLowerCase();
        let num = parseFloat(str);
        if (isNaN(num)) return 60000;
        if (str.endsWith('h')) return num * 3600000;
        if (str.endsWith('m')) return num * 60000;
        if (str.endsWith('s')) return num * 1000;
        return num * 60000;
    }

    function updateUIStatus() {
        const el = document.getElementById('ogpro-status');
        if (el) el.innerText = botStatusMsg;
    }

    const style = document.createElement('style');
    function updateStyles() {
        style.innerHTML = `
            #ogpro-container { position: fixed; bottom: 30px; right: 30px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; }
            #ogpro-container * { box-sizing: border-box; }

            #ogpro-toggle { background: ${theme.bg}; border: 2px solid ${theme.stroke}; color: #ffffff; padding: 12px 18px; cursor: pointer; font-size: 15px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.4); margin-left: auto; width: fit-content; }
            #ogpro-toggle:hover { transform: translateY(-2px); border-color: ${theme.text}; box-shadow: 0 10px 25px rgba(0,0,0,0.6); }

            #ogpro-panel { background: ${theme.bg}; border: 2px solid ${theme.stroke}; width: 420px; display: none; flex-direction: column; box-shadow: 0 15px 40px rgba(0,0,0,0.8); margin-bottom: 12px; border-radius: 16px; overflow: hidden; opacity: 0; transform: translateY(15px); transition: opacity 0.2s, transform 0.2s; }
            #ogpro-panel.show { display: flex; opacity: 1; transform: translateY(0); }

            .ogpro-header { background: rgba(0,0,0,0.2); border-bottom: 1px solid ${theme.stroke}; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
            .ogpro-header-title { font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
            .ogpro-header-title i { color: ${theme.text}; }

            #ogpro-tabs { display: flex; background: rgba(0,0,0,0.3); border-bottom: 1px solid ${theme.stroke}; padding: 6px; gap: 4px; }
            .ogpro-tab-btn { flex: 1; background: transparent; border: none; color: #888888; padding: 10px 0; cursor: pointer; font-size: 11px; font-weight: 700; text-transform: uppercase; border-radius: 8px; }
            .ogpro-tab-btn:hover { color: #ffffff; background: rgba(255,255,255,0.05); }
            .ogpro-tab-btn.active { color: #ffffff; background: ${theme.buttons}; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }

            .ogpro-tab-content { padding: 20px; height: 400px; overflow-y: auto; display: none; background: ${theme.bg}; }
            .ogpro-tab-content.active { display: block; }

            .ogpro-title { font-size: 11px; color: ${theme.text}; border-bottom: 1px solid ${theme.stroke}; padding-bottom: 6px; margin-bottom: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
            .ogpro-label { display: block; font-size: 10px; color: #aaaaaa; margin-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

            .ogpro-input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid ${theme.stroke}; color: #ffffff; padding: 10px 14px; margin-bottom: 14px; outline: none; border-radius: 8px; font-size: 12px; }
            .ogpro-input:focus { border-color: ${theme.text}; box-shadow: 0 0 8px rgba(255,255,255,0.1); }

            .ogpro-btn { width: 100%; background: ${theme.buttons}; border: none; color: #ffffff; padding: 12px; cursor: pointer; font-weight: 700; border-radius: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            .ogpro-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

            .ogpro-row { display: flex; gap: 10px; margin-bottom: 4px; }
            .ogpro-row .ogpro-input { margin-bottom: 0; }

            .ogpro-subtabs { display: flex; margin-bottom: 16px; background: rgba(0,0,0,0.4); border: 1px solid ${theme.stroke}; border-radius: 8px; padding: 4px; }
            .ogpro-subtab-btn { flex: 1; background: transparent; border: none; color: #888888; padding: 8px; cursor: pointer; font-size: 11px; font-weight: 700; border-radius: 6px; }
            .ogpro-subtab-btn.active { background: ${theme.stroke}; color: #ffffff; }

            .ogpro-item { background: rgba(255,255,255,0.02); border: 1px solid ${theme.stroke}; border-left: 3px solid ${theme.text}; padding: 10px 12px; margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
            .ogpro-item-title { font-size: 11px; word-break: break-all; margin-right: 10px; color: #ffffff; }

            .ogpro-icon-btn { background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.3); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 11px; }
            .ogpro-icon-btn:hover { background: #ff4444; color: #ffffff; }
            .ogpro-save-btn { background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
            .ogpro-save-btn:hover { background: #4ade80; color: #000000; }

            .ogpro-folder { background: rgba(0,0,0,0.3); border: 1px solid ${theme.stroke}; border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
            .ogpro-folder-head { background: rgba(255,255,255,0.03); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
            .ogpro-folder-title { font-size: 12px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px; }
            .ogpro-badge { background: ${theme.text}; color: #ffffff; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 800; }
            .ogpro-folder-body { padding: 14px; border-top: 1px solid ${theme.stroke}; background: rgba(0,0,0,0.2); }
            .chevron { transition: transform 0.2s; color: #888888; }
            .chevron.up { transform: rotate(180deg); }

            .ogpro-toggle-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 12px 14px; margin-bottom: 10px; border-radius: 10px; border: 1px solid ${theme.stroke}; }
            .ogpro-toggle-row.on { border-color: #4ade80; background: rgba(74, 222, 128, 0.05); }
            .ogpro-switch { width: 44px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 12px; position: relative; cursor: pointer; border: 1px solid ${theme.stroke}; padding: 0; }
            .ogpro-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #ffffff; border-radius: 50%; transition: 0.2s; }
            .ogpro-switch.on { background: #4ade80; border-color: #4ade80; }
            .ogpro-switch.on::after { transform: translateX(20px); }

            .ogpro-color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
            .lang-btn-group { display: flex; gap: 8px; margin-bottom: 14px; }
            .lang-btn { flex: 1; background: rgba(0,0,0,0.4); border: 1px solid ${theme.stroke}; color: #888888; padding: 8px; cursor: pointer; font-weight: 700; border-radius: 6px; font-size: 11px; }
            .lang-btn.active { background: ${theme.buttons}; color: #ffffff; border-color: ${theme.buttons}; }

            #ogpro-status { background: rgba(0,0,0,0.6); border: 1px solid ${theme.stroke}; padding: 14px; font-size: 11px; color: #4ade80; border-radius: 8px; min-height: 80px; word-break: break-all; margin-top: 14px; font-family: 'Consolas', monospace; }

            ::-webkit-scrollbar { width: 5px; }
            ::-webkit-scrollbar-thumb { background: ${theme.stroke}; border-radius: 4px; }
        `;
    }
    updateStyles();
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'ogpro-container';

    function renderAppHTML() {
        container.innerHTML = `
            <div id="ogpro-panel" class="${isPanelOpen ? 'show' : ''}" style="${isPanelOpen ? 'display: flex; opacity: 1; transform: translateY(0);' : ''}">
                <div class="ogpro-header">
                    <div class="ogpro-header-title"><i class="fa-solid fa-layer-group"></i> ${t('title')}</div>
                    <div style="font-size: 10px; color: #888888; border: 1px solid ${theme.stroke}; padding: 3px 8px; border-radius: 6px; font-weight: 700;">v10.2</div>
                </div>

                <div id="ogpro-tabs">
                    <button class="ogpro-tab-btn ${currentTab === 'links' ? 'active' : ''}" data-tab="links"><i class="fa-solid fa-link"></i> <span>${t('linksTab')}</span></button>
                    <button class="ogpro-tab-btn ${currentTab === 'delay' ? 'active' : ''}" data-tab="delay"><i class="fa-solid fa-clock"></i> <span>${t('delayTab')}</span></button>
                    <button class="ogpro-tab-btn ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings"><i class="fa-solid fa-palette"></i> <span>${t('settingsTab')}</span></button>
                    <button class="ogpro-tab-btn ${currentTab === 'bot' ? 'active' : ''}" data-tab="bot"><i class="fa-solid fa-robot"></i> <span>${t('botTab')}</span></button>
                </div>

                <div id="tab-links" class="ogpro-tab-content ${currentTab === 'links' ? 'active' : ''}">
                    <div class="ogpro-subtabs">
                        <button class="ogpro-subtab-btn ${currentTabLinks === 'bumps' ? 'active' : ''}" data-sub="bumps">${t('bumpsSub')}</button>
                        <button class="ogpro-subtab-btn ${currentTabLinks === 'events' ? 'active' : ''}" data-sub="events">${t('eventsSub')}</button>
                    </div>

                    <div id="view-bumps" style="display: ${currentTabLinks === 'bumps' ? 'block' : 'none'};">
                        <label class="ogpro-label">${t('msgTemplate')}</label>
                        <div class="ogpro-row" style="margin-bottom:14px;">
                            <input type="text" id="inp-bump-msg" class="ogpro-input" value="${bumpMsg}" placeholder="Ej: grinding x{count}">
                            <input type="number" id="inp-bump-count" class="ogpro-input" style="width:65px;" value="${count}">
                            <button id="btn-save-bump-cfg" class="ogpro-btn ogpro-icon-btn ogpro-save-btn" style="width:40px; padding:0; border-radius:8px;" title="${t('saveBumpCfg')}"><i class="fa-solid fa-save"></i></button>
                        </div>

                        <label class="ogpro-label">${t('addBump')}</label>
                        <div class="ogpro-row">
                            <input type="text" id="inp-bump" class="ogpro-input" placeholder="URL del thread...">
                            <button id="btn-add-bump" class="ogpro-btn" style="width:44px; padding:0; border-radius:8px;"><i class="fa-solid fa-plus"></i></button>
                        </div>
                        <div id="list-bumps" style="margin-top:10px;"></div>
                    </div>

                    <div id="view-events" style="display: ${currentTabLinks === 'events' ? 'block' : 'none'};">
                        <label class="ogpro-label">${t('createFolder')}</label>
                        <div class="ogpro-row">
                            <input type="text" id="inp-folder" class="ogpro-input" placeholder="Nombre...">
                            <button id="btn-add-folder" class="ogpro-btn" style="width:44px; padding:0; border-radius:8px;"><i class="fa-solid fa-folder-plus"></i></button>
                        </div>
                        <div id="list-folders" style="margin-top:10px;"></div>
                    </div>
                </div>

                <div id="tab-delay" class="ogpro-tab-content ${currentTab === 'delay' ? 'active' : ''}">
                    <div class="ogpro-title">${t('bumpsConfig')}</div>
                    <label class="ogpro-label">${t('globalCycle')}</label>
                    <input type="text" id="cfg-b-cyc" class="ogpro-input" value="${cfg.bumpCycle}">
                    <div class="ogpro-row">
                        <div style="flex:1;"><label class="ogpro-label">Smooth Min</label><input type="text" id="cfg-b-min" class="ogpro-input" value="${cfg.bumpMin}"></div>
                        <div style="flex:1;"><label class="ogpro-label">Smooth Max</label><input type="text" id="cfg-b-max" class="ogpro-input" value="${cfg.bumpMax}"></div>
                    </div>

                    <div class="ogpro-title" style="margin-top:20px;">${t('eventsConfig')}</div>
                    <label class="ogpro-label">${t('globalCycle')}</label>
                    <input type="text" id="cfg-e-cyc" class="ogpro-input" value="${cfg.eventCycle}">
                    <div class="ogpro-row">
                        <div style="flex:1;"><label class="ogpro-label">Smooth Min</label><input type="text" id="cfg-e-min" class="ogpro-input" value="${cfg.eventMin}"></div>
                        <div style="flex:1;"><label class="ogpro-label">Smooth Max</label><input type="text" id="cfg-e-max" class="ogpro-input" value="${cfg.eventMax}"></div>
                    </div>

                    <button id="btn-save-delay" class="ogpro-btn" style="margin-top:14px;"><i class="fa-solid fa-floppy-disk"></i> <span>${t('saveTimes')}</span></button>
                </div>

                <div id="tab-settings" class="ogpro-tab-content ${currentTab === 'settings' ? 'active' : ''}">
                    <div class="ogpro-title">${t('languageLabel')}</div>
                    <div class="lang-btn-group">
                        <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">English</button>
                        <button class="lang-btn ${currentLang === 'es' ? 'active' : ''}" data-lang="es">Español</button>
                        <button class="lang-btn ${currentLang === 'ru' ? 'active' : ''}" data-lang="ru">Русский</button>
                    </div>

                    <div class="ogpro-title" style="margin-top:15px;">${t('uiCustomization')}</div>
                    <div class="ogpro-color-grid">
                        <div>
                            <label class="ogpro-label">${t('bgLabel')}</label>
                            <input type="color" id="theme-bg" class="ogpro-input" value="${theme.bg}" style="height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                        <div>
                            <label class="ogpro-label">${t('strokeLabel')}</label>
                            <input type="color" id="theme-stroke" class="ogpro-input" value="${theme.stroke}" style="height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                        <div>
                            <label class="ogpro-label">${t('buttonsLabel')}</label>
                            <input type="color" id="theme-buttons" class="ogpro-input" value="${theme.buttons}" style="height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                        <div>
                            <label class="ogpro-label">${t('textLabel')}</label>
                            <input type="color" id="theme-text" class="ogpro-input" value="${theme.text}" style="height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                    </div>
                    <button id="btn-save-theme" class="ogpro-btn"><i class="fa-solid fa-palette"></i> <span>${t('applyTheme')}</span></button>
                </div>

                <div id="tab-bot" class="ogpro-tab-content ${currentTab === 'bot' ? 'active' : ''}">
                    <div class="ogpro-title">${t('controlPanel')}</div>
                    <div id="bot-toggles-container"></div>

                    <div class="ogpro-title" style="margin-top:20px;">${t('discordWebhook')}</div>
                    <input type="text" id="inp-webhook" class="ogpro-input" value="${cfg.webhook}" placeholder="https://discord.com/api/...">
                    <button id="btn-save-webhook" class="ogpro-btn"><i class="fa-solid fa-cloud-arrow-up"></i> <span>${t('updateWebhook')}</span></button>

                    <div id="ogpro-status">${botStatusMsg}</div>
                </div>
            </div>
            <div id="ogpro-toggle"><i class="fa-solid fa-layer-group"></i> OG Pro</div>
        `;
    }
    renderAppHTML();
    document.body.appendChild(container);

    // Delegación global sobre el contenedor que nunca se destruye
    container.addEventListener('click', (e) => {
        // Toggle de la interfaz principal
        if (e.target.closest('#ogpro-toggle')) {
            const panel = document.getElementById('ogpro-panel');
            if (panel.classList.contains('show')) {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(15px)';
                setTimeout(() => panel.classList.remove('show'), 200);
                isPanelOpen = false;
            } else {
                panel.classList.add('show');
                setTimeout(() => { panel.style.opacity = '1'; panel.style.transform = 'translateY(0)'; }, 10);
                isPanelOpen = true;
            }
            return;
        }

        // Pestañas principales
        const tabBtn = e.target.closest('.ogpro-tab-btn');
        if (tabBtn) {
            currentTab = tabBtn.getAttribute('data-tab');
            document.querySelectorAll('.ogpro-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.ogpro-tab-content').forEach(c => c.classList.remove('active'));
            tabBtn.classList.add('active');
            const targetContent = document.getElementById(`tab-${currentTab}`);
            if (targetContent) targetContent.classList.add('active');
            if (currentTab === 'bot') renderBotTab();
            return;
        }

        // Subpestañas (Bumps / Eventos)
        const subBtn = e.target.closest('.ogpro-subtab-btn');
        if (subBtn) {
            document.querySelectorAll('.ogpro-subtab-btn').forEach(b => b.classList.remove('active'));
            subBtn.classList.add('active');
            currentTabLinks = subBtn.getAttribute('data-sub');
            const viewBumps = document.getElementById('view-bumps');
            const viewEvents = document.getElementById('view-events');
            if (viewBumps && viewEvents) {
                viewBumps.style.display = currentTabLinks === 'bumps' ? 'block' : 'none';
                viewEvents.style.display = currentTabLinks === 'events' ? 'block' : 'none';
            }
            return;
        }

        // Botones de idiomas (FIX del bug)
        const langBtn = e.target.closest('.lang-btn');
        if (langBtn) {
            currentLang = langBtn.getAttribute('data-lang');
            saveAll();
            renderAppHTML();
            renderLinks();
            renderBotTab();
            return;
        }

        // Botones de guardado general
        if (e.target.closest('#btn-save-bump-cfg')) {
            const msgInp = document.getElementById('inp-bump-msg');
            const cntInp = document.getElementById('inp-bump-count');
            if (msgInp) bumpMsg = msgInp.value;
            if (cntInp) count = parseInt(cntInp.value) || 1;
            saveAll();
            alert(t('settingsSaved'));
            return;
        }

        if (e.target.closest('#btn-save-theme')) {
            const bgInp = document.getElementById('theme-bg');
            const strokeInp = document.getElementById('theme-stroke');
            const buttonsInp = document.getElementById('theme-buttons');
            const textInp = document.getElementById('theme-text');
            if (bgInp) theme.bg = bgInp.value;
            if (strokeInp) theme.stroke = strokeInp.value;
            if (buttonsInp) theme.buttons = buttonsInp.value;
            if (textInp) theme.text = textInp.value;
            saveAll();
            updateStyles();
            alert(t('themeSaved'));
            return;
        }

        if (e.target.closest('#btn-add-bump')) {
            const valInp = document.getElementById('inp-bump');
            if (valInp) {
                const val = valInp.value.trim();
                if (val) {
                    if (state.bumps.includes(val)) alert(t('urlAlreadyBump'));
                    else { state.bumps.push(val); valInp.value = ''; saveAll(); renderLinks(); }
                }
            }
            return;
        }

        if (e.target.closest('#btn-add-folder')) {
            const valInp = document.getElementById('inp-folder');
            if (valInp) {
                const val = valInp.value.trim();
                if (val) {
                    const id = 'evt_' + Date.now();
                    state.events.push({ id, name: val, links: [], isExpanded: true, message: 'grinding x{count}', count: 1 });
                    state.activeEvents[id] = false; state.nextEventRuns[id] = 0; state.completedEvents[id] = [];
                    valInp.value = '';
                    saveAll(); renderLinks(); renderBotTab();
                }
            }
            return;
        }

        if (e.target.closest('#btn-save-delay')) {
            const bCyc = document.getElementById('cfg-b-cyc');
            const bMin = document.getElementById('cfg-b-min');
            const bMax = document.getElementById('cfg-b-max');
            const eCyc = document.getElementById('cfg-e-cyc');
            const eMin = document.getElementById('cfg-e-min');
            const eMax = document.getElementById('cfg-e-max');
            if (bCyc) cfg.bumpCycle = bCyc.value || '60m';
            if (bMin) cfg.bumpMin = bMin.value || '30s';
            if (bMax) cfg.bumpMax = bMax.value || '60s';
            if (eCyc) cfg.eventCycle = eCyc.value || '60m';
            if (eMin) cfg.eventMin = eMin.value || '30s';
            if (eMax) cfg.eventMax = eMax.value || '60s';
            saveAll(); alert(t('timesSaved'));
            return;
        }

        if (e.target.closest('#btn-save-webhook')) {
            const whInp = document.getElementById('inp-webhook');
            if (whInp) cfg.webhook = whInp.value.trim();
            saveAll(); alert(t('webhookSaved'));
            return;
        }

        // Acciones dentro de carpetas y listas
        const delBumpBtn = e.target.closest('.del-bump-btn');
        if (delBumpBtn) {
            const idx = parseInt(delBumpBtn.getAttribute('data-idx'));
            state.bumps.splice(idx, 1);
            saveAll(); renderLinks();
            return;
        }

        const folderId = e.target.closest('[data-fid]')?.getAttribute('data-fid');
        if (folderId) {
            const folder = state.events.find(f => f.id === folderId);
            if (folder) {
                if (e.target.closest('.save-evt-cfg-btn')) {
                    const msgInp = document.getElementById(`inp-evt-msg-${folderId}`);
                    const cntInp = document.getElementById(`inp-evt-count-${folderId}`);
                    if (msgInp) folder.message = msgInp.value;
                    if (cntInp) folder.count = parseInt(cntInp.value) || 1;
                    saveAll(); alert(t('settingsSaved'));
                    return;
                }
                if (e.target.closest('.add-evt-link-btn')) {
                    const input = document.getElementById(`inp-evt-${folderId}`);
                    if (input) {
                        const val = input.value.trim();
                        if (val) {
                            if (folder.links.includes(val)) alert(t('urlAlreadyFolder'));
                            else { folder.links.push(val); input.value = ''; saveAll(); renderLinks(); }
                        }
                    }
                    return;
                }
                if (e.target.closest('.del-folder-btn')) {
                    e.stopPropagation();
                    state.events = state.events.filter(f => f.id !== folderId);
                    delete state.activeEvents[folderId]; delete state.nextEventRuns[folderId]; delete state.completedEvents[folderId];
                    saveAll(); renderLinks(); renderBotTab();
                    return;
                }
                if (e.target.closest('.ogpro-folder-head')) {
                    folder.isExpanded = !folder.isExpanded;
                    saveAll(); renderLinks();
                    return;
                }
                const delLinkBtn = e.target.closest('.del-evt-link-btn');
                if (delLinkBtn) {
                    folder.links.splice(parseInt(delLinkBtn.getAttribute('data-idx')), 1);
                    saveAll(); renderLinks();
                    return;
                }
            }
        }

        // Toggles de activación en pestaña bot
        const switchBtn = e.target.closest('.ogpro-switch');
        if (switchBtn) {
            const type = switchBtn.getAttribute('data-type');
            if (type === 'global') {
                state.activeBumps = !state.activeBumps;
                if (!state.activeBumps) {
                    queue = queue.filter(q => q.type !== 'bump');
                    if (activeIframe && activeIframe.dataset.type === 'bump') {
                        activeIframe.remove();
                        activeIframe = null;
                        isProcessing = false;
                    }
                } else {
                    state.nextBumpRun = Date.now();
                }
            } else if (type === 'award') {
                awardNotifierActive = !awardNotifierActive;
            } else if (type === 'event') {
                const fid = switchBtn.getAttribute('data-fid');
                state.activeEvents[fid] = !state.activeEvents[fid];
                if (!state.activeEvents[fid]) {
                    queue = queue.filter(q => q.folderId !== fid);
                    if (activeIframe && activeIframe.dataset.folderId === fid) {
                        activeIframe.remove();
                        activeIframe = null;
                        isProcessing = false;
                    }
                } else {
                    state.nextEventRuns[fid] = Date.now();
                }
            }
            saveAll(); renderBotTab();
            return;
        }
    });

    function updateReadyUI() {
        document.querySelectorAll('.bump-row-item').forEach(row => {
            const url = row.getAttribute('data-url');
            const isReady = state.completedBumps.includes(url);
            row.style.borderLeftColor = isReady ? '#4ade80' : theme.text;
            const titleSpan = row.querySelector('.ogpro-item-title');
            if (titleSpan) titleSpan.innerHTML = isReady ? `<span style="color:#4ade80;"><b>[READY]</b> ${url}</span>` : url;
        });

        document.querySelectorAll('.evt-row-item').forEach(row => {
            const url = row.getAttribute('data-url');
            const fid = row.getAttribute('data-fid');
            const isReady = (state.completedEvents[fid] || []).includes(url);
            row.style.borderLeftColor = isReady ? '#4ade80' : '#555555';
            const titleSpan = row.querySelector('.ogpro-item-title');
            if (titleSpan) titleSpan.innerHTML = isReady ? `<span style="color:#4ade80;"><b>[READY]</b> ${url}</span>` : url;
        });
    }

    function renderLinks() {
        const bumpsEl = document.getElementById('list-bumps');
        const foldersEl = document.getElementById('list-folders');
        if (!bumpsEl || !foldersEl) return;

        bumpsEl.innerHTML = state.bumps.map((l, i) => `
            <div class="ogpro-item bump-row-item" data-url="${l}">
                <span class="ogpro-item-title">${l}</span>
                <button class="ogpro-icon-btn del-bump-btn" data-idx="${i}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        foldersEl.innerHTML = state.events.map(f => `
            <div class="ogpro-folder" data-fid="${f.id}">
                <div class="ogpro-folder-head">
                    <div class="ogpro-folder-title"><i class="fa-solid fa-folder-open" style="color:${theme.text};"></i> ${f.name} <span class="ogpro-badge">${f.links.length}</span></div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="ogpro-icon-btn del-folder-btn" style="width:24px; height:24px; font-size:10px;"><i class="fa-solid fa-trash"></i></button>
                        <i class="fa-solid fa-chevron-down chevron ${f.isExpanded ? 'up' : ''}"></i>
                    </div>
                </div>
                <div class="ogpro-folder-body" style="display: ${f.isExpanded ? 'block' : 'none'};">
                    <label class="ogpro-label">${t('folderMsg')}</label>
                    <div class="ogpro-row" style="margin-bottom: 12px;">
                        <input type="text" id="inp-evt-msg-${f.id}" class="ogpro-input" value="${f.message || 'grinding x{count}'}">
                        <input type="number" id="inp-evt-count-${f.id}" class="ogpro-input" style="width:60px;" value="${f.count || 1}">
                        <button class="ogpro-btn ogpro-icon-btn ogpro-save-btn save-evt-cfg-btn" style="width:40px; padding:0; border-radius:8px;" title="Guardar"><i class="fa-solid fa-save"></i></button>
                    </div>

                    <label class="ogpro-label">${t('addLink')}</label>
                    <div class="ogpro-row">
                        <input type="text" id="inp-evt-${f.id}" class="ogpro-input" placeholder="Pegar URL...">
                        <button class="ogpro-btn add-evt-link-btn" style="width:40px; padding:0; border-radius:8px;"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    ${f.links.map((l, i) => `
                        <div class="ogpro-item evt-row-item" data-url="${l}" data-fid="${f.id}" style="padding:8px 10px; margin-bottom:6px;">
                            <span class="ogpro-item-title" style="font-size:10px;">${l}</span>
                            <button class="ogpro-icon-btn del-evt-link-btn" data-idx="${i}" style="width:22px; height:22px; font-size:9px;"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        updateReadyUI();
    }

    function renderBotTab() {
        const botContainer = document.getElementById('bot-toggles-container');
        if (!botContainer) return;

        let html = `
            <div class="ogpro-toggle-row ${state.activeBumps ? 'on' : ''}">
                <span style="font-weight:700; color:#ffffff; font-size:12px;"><i class="fa-solid fa-bolt" style="color:${theme.text};"></i> ${t('globalBumps')}</span>
                <button class="ogpro-switch ${state.activeBumps ? 'on' : ''}" data-type="global"></button>
            </div>

            <div class="ogpro-toggle-row ${awardNotifierActive ? 'on' : ''}" style="margin-top:8px;">
                <span style="font-weight:700; color:#ffffff; font-size:12px;"><i class="fa-solid fa-award" style="color:${theme.text};"></i> ${t('awardNotifier')}</span>
                <button class="ogpro-switch ${awardNotifierActive ? 'on' : ''}" data-type="award"></button>
            </div>

            <div class="ogpro-title" style="margin-top:20px;">${t('eventFolders')}</div>
        `;
        if (state.events.length === 0) html += `<div style="color:#666666; font-size:11px; font-style:italic;">${t('noFolders')}</div>`;
        state.events.forEach(f => {
            const isOn = state.activeEvents[f.id];
            html += `
            <div class="ogpro-toggle-row ${isOn ? 'on' : ''}">
                <span style="font-size:12px; color:#cccccc;"><i class="fa-solid fa-folder" style="color:#888888;"></i> ${f.name}</span>
                <button class="ogpro-switch ${isOn ? 'on' : ''}" data-type="event" data-fid="${f.id}"></button>
            </div>`;
        });
        botContainer.innerHTML = html;
        updateUIStatus();
    }

    function sendStartWebhook(title, linksList, nextTimeMs) {
        if (!cfg.webhook) return;
        const timeStr = new Date(nextTimeMs).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        let descList = linksList.map((link, idx) => `**${idx + 1}.** ${link}`).join('\n');

        GM_xmlhttpRequest({
            method: "POST", url: cfg.webhook, headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ embeds: [{ title: `⚡ Inicia ciclo: ${title}`, description: `**Total Enlaces:** ${linksList.length}\n**Próximo Ciclo:** ${timeStr}\n\n**Links a procesar:**\n${descList}`, color: 16777215 }] })
        });
    }

    function sendCompletionWebhook(item) {
        if (!cfg.webhook) return;
        let title = item.type === 'bump' ? 'Bumps Finalizados' : `${item.name} Finalizado`;
        let completedList = item.type === 'bump' ? state.completedBumps : (state.completedEvents[item.folderId] || []);
        let sourceList = item.type === 'bump' ? state.bumps : (state.events.find(f => f.id === item.folderId)?.links || []);

        let remainingCount = sourceList.length - completedList.length;
        let desc = sourceList.map((link, idx) => {
            return `**${idx + 1}.** ${link} ${completedList.includes(link) ? '✅ `[READY]`' : '❌ `[ERROR]`'}`;
        }).join('\n');

        GM_xmlhttpRequest({
            method: "POST", url: cfg.webhook, headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ embeds: [{ title: `✔️ ${title}`, description: `**Faltantes / Pendientes:** ${remainingCount}\n\n${desc}`, color: 4907106 }] })
        });
    }

    function checkNewAwardsFromDoc(doc) {
        const rows = doc.querySelectorAll('.inline_row, tr');
        rows.forEach(row => {
            const authorEl = row.querySelector('.author, .subject_new a, a[href*="member.php"]');
            const authorText = authorEl ? authorEl.innerText.trim() : "";

            if (authorText === "OGU" || authorText === "OGU Bot") {
                const fullText = row.innerText;

                if (fullText.includes("You have received the") || fullText.includes("You've been given the")) {
                    const match = fullText.match(/(?:received the|given the)\s+["'](.*?)["']\s+award/i) || fullText.match(/\[b\](.*?)\[\/b\]/i);
                    const awardName = match ? match[1].replace(/["']/g, "").trim() : "New Award";

                    const linkEl = row.querySelector('a[href*="private.php?action=read"]');
                    const pmUrl = linkEl ? linkEl.href : window.location.href;
                    const uniqueKey = 'award_sent_' + pmUrl;

                    if (!GM_getValue(uniqueKey, false)) {
                        GM_setValue(uniqueKey, true);

                        GM_xmlhttpRequest({
                            method: "POST", url: cfg.webhook, headers: { "Content-Type": "application/json" },
                            data: JSON.stringify({ embeds: [{ title: `🏆 ¡Nuevo Award Recibido!`, description: `${awardName}`, color: 16777215 }] })
                        });
                    }
                }
            }
        });
    }

    function checkNewAwards() {
        if (!awardNotifierActive || !cfg.webhook) return;

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://oguser.com/private.php",
            onload: function(response) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");
                    checkNewAwardsFromDoc(doc);
                } catch(e) {}
            }
        });

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://oguser.com/messages",
            onload: function(response) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");
                    checkNewAwardsFromDoc(doc);
                } catch(e) {}
            }
        });
    }

    function processIframe(item) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.dataset.type = item.type;
            if (item.folderId) iframe.dataset.folderId = item.folderId;
            iframe.src = item.url;
            activeIframe = iframe;
            document.body.appendChild(iframe);

            setTimeout(() => {
                try {
                    if (!document.body.contains(iframe)) {
                        return resolve(false);
                    }
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (doc.title.includes('Just a moment') || doc.querySelector('.cf-browser-verification')) {
                        botStatusMsg = `⚠️ Cloudflare Bloqueo\nLink: ${item.url}`;
                        iframe.remove(); activeIframe = null; return resolve(false);
                    }
                    const textarea = doc.querySelector('textarea[name="message"]') || doc.querySelector('#message');
                    const submitBtn = doc.querySelector('input[name="submit"]') || doc.querySelector('#quick_reply_submit');

                    if (textarea && submitBtn) {
                        let finalMessage = "";
                        let currentCount = 1;
                        let folderObj = null;

                        if (item.type === 'bump') {
                            currentCount = GM_getValue('OG_PRO_count', 1);
                            count = currentCount + 1;
                            GM_setValue('OG_PRO_count', count);
                            finalMessage = bumpMsg.replace(/{count}/gi, currentCount);
                            const bInp = document.getElementById('inp-bump-count');
                            if(bInp) bInp.value = count;
                        } else {
                            folderObj = state.events.find(f => f.id === item.folderId);
                            if (folderObj) {
                                currentCount = folderObj.count || 1;
                                folderObj.count = currentCount + 1;
                                saveAll();
                                let template = folderObj.message || 'grinding x{count}';
                                finalMessage = template.replace(/{count}/gi, currentCount);
                                const fInp = document.getElementById(`inp-evt-count-${folderObj.id}`);
                                if(fInp) fInp.value = folderObj.count;
                            }
                        }

                        textarea.value = finalMessage;
                        submitBtn.click();

                        botStatusMsg = `✅ Enviado con éxito\nMensaje: ${finalMessage}\nDestino: ${item.name || 'Bumps'}`;
                        setTimeout(() => {
                            if (document.body.contains(iframe)) iframe.remove();
                            activeIframe = null;
                            resolve(true);
                        }, 4000);
                    } else {
                        botStatusMsg = `❌ Error: Captcha / Input no encontrado\nLink: ${item.url}`;
                        iframe.remove(); activeIframe = null; resolve(false);
                    }
                } catch (e) {
                    botStatusMsg = `❌ Error: Carga fallida\nLink: ${item.url}`;
                    if (document.body.contains(iframe)) iframe.remove();
                    activeIframe = null; resolve(false);
                }
            }, 6000);
        });
    }

    async function processMasterQueue() {
        if (isProcessing) return;
        if (queue.length > 0) {
            const item = queue[0];

            const isBumpStillActive = item.type === 'bump' && state.activeBumps;
            const isEventStillActive = item.type === 'event' && state.activeEvents[item.folderId];

            if (!isBumpStillActive && !isEventStillActive) {
                queue.shift();
                saveAll();
                return;
            }

            isProcessing = true;
            botStatusMsg = `⏳ Procesando...\nDestino: ${item.name || 'Bumps'}\nLink: ${item.url}`;
            updateUIStatus();

            const success = await processIframe(item);

            if (success) {
                if (item.type === 'bump') {
                    if (!state.completedBumps.includes(item.url)) state.completedBumps.push(item.url);
                } else {
                    if (!state.completedEvents[item.folderId]) state.completedEvents[item.folderId] = [];
                    if (!state.completedEvents[item.folderId].includes(item.url)) state.completedEvents[item.folderId].push(item.url);
                }
                saveAll();
                updateReadyUI();
            }

            queue.shift();
            saveAll();

            const remainingSameGroup = queue.filter(q => q.type === item.type && (item.type === 'bump' ? true : q.folderId === item.folderId)).length;
            if (remainingSameGroup === 0) {
                sendCompletionWebhook(item);
            }

            if (queue.length > 0) {
                let minMs = parseTimeToMs(item.type === 'bump' ? cfg.bumpMin : cfg.eventMin);
                let maxMs = parseTimeToMs(item.type === 'bump' ? cfg.bumpMax : cfg.eventMax);
                if (minMs > maxMs) maxMs = minMs;
                const delayMs = Math.floor(Math.random() * ((maxMs - minMs) + 1)) + minMs;
                delayEndTime = Date.now() + delayMs;
                botStatusMsg += `\n\n⏱️ Smooth Delay: ${(delayMs/1000).toFixed(1)}s`;
                updateUIStatus();
                setTimeout(() => { isProcessing = false; }, delayMs);
            } else {
                botStatusMsg = `✨ Cola vacía. Esperando ciclos...`;
                updateUIStatus();
                isProcessing = false;
            }
        }
    }

    setInterval(() => {
        const now = Date.now();

        if (state.activeBumps && state.bumps.length > 0 && now >= state.nextBumpRun) {
            state.nextBumpRun = now + parseTimeToMs(cfg.bumpCycle);
            state.completedBumps = [];
            state.bumps.forEach(url => queue.push({ type: 'bump', url: url, name: 'Bumps' }));
            saveAll(); renderLinks();
            sendStartWebhook("Bumpeando", state.bumps, state.nextBumpRun);
        }

        state.events.forEach(f => {
            if (state.activeEvents[f.id] && f.links.length > 0 && now >= (state.nextEventRuns[f.id] || 0)) {
                state.nextEventRuns[f.id] = now + parseTimeToMs(cfg.eventCycle);
                state.completedEvents[f.id] = [];
                f.links.forEach(url => queue.push({ type: 'event', url: url, name: f.name, folderId: f.id }));
                saveAll(); renderLinks();
                sendStartWebhook(f.name, f.links, state.nextEventRuns[f.id]);
            }
        });

        if (awardNotifierActive && (now - lastCheckedAwardTime > 120000)) {
            lastCheckedAwardTime = now;
            saveAll();
            checkNewAwards();
        }

        if (!isProcessing && queue.length > 0 && now >= delayEndTime) {
            processMasterQueue();
        }

        if (!isProcessing) {
            updateUIStatus();
        }

    }, 1000);

    renderLinks();
    renderBotTab();

})();
