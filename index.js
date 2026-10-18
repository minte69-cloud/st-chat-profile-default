import { KEY, settings, hasChat, createController } from './core.js';

let initialized = false;

export function activate() {
    if (initialized) return;
    initialized = true;
    const getContext = () => SillyTavern.getContext();
    const { eventSource, eventTypes } = getContext();
    let panel;
    let lastStatus = '';
    let scheduled;
    let dialogOpen = false;
    const controller = createController(getContext, text => {
        lastStatus = text;
        if (panel) panel.querySelector('[data-status]').textContent = text;
    }, text => globalThis.toastr?.warning(text, '채팅별 연결 프로필', { escapeHtml: true }));

    function scheduleApply() {
        clearTimeout(scheduled);
        scheduled = setTimeout(() => { void controller.request(); }, 0);
    }

    function populate(select, blank, value, profiles) {
        select.replaceChildren(new Option(blank, ''));
        for (const profile of profiles) select.add(new Option(profile.name, profile.id));
        if (value && !profiles.some(p => p.id === value)) {
            select.add(new Option('⚠ 삭제된 연결 프로필 — 다시 선택하세요', value));
        }
        select.value = value || '';
    }

    function render() {
        if (!panel) return;
        const context = getContext();
        const config = settings(context);
        const profiles = [...(context.extensionSettings.connectionManager?.profiles ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name));
        panel.querySelector('[data-enabled]').checked = config.enabled;
        populate(panel.querySelector('[data-default]'), '기본 연결 프로필을 선택하세요', config.defaultId, profiles);
        const pin = panel.querySelector('[data-pin]');
        populate(pin, '예외 없음 → 기본 B 사용', hasChat(context) ? context.chatMetadata?.[KEY]?.profileId : '', profiles);
        pin.disabled = !hasChat(context);
        panel.querySelector('[data-chat]').textContent = hasChat(context)
            ? `현재 채팅: ${context.chatId}` : '열린 채팅 없음 · 채팅을 열면 예외를 지정할 수 있습니다.';
        panel.querySelector('[data-status]').textContent = lastStatus;
    }

    function mount() {
        if (panel) return;
        panel = document.createElement('div');
        panel.id = 'chat-profile-default';
        // Static markup only; profile names are inserted using Option/textContent.
        panel.innerHTML = `
            <header class="chat-profile-header">
                <h3>채팅별 연결 프로필</h3>
                <div data-chat class="chat-profile-current"></div>
            </header>
            <label class="chat-profile-toggle checkbox_label">
                <input type="checkbox" data-enabled><span>자동 전환 사용</span>
            </label>
            <div class="chat-profile-fields">
                <label class="chat-profile-field"><span>기본 연결 프로필 B</span>
                    <select class="text_pole" data-default></select>
                </label>
                <label class="chat-profile-field"><span>이 채팅의 예외 프로필 A</span>
                    <select class="text_pole" data-pin></select>
                </label>
                <small>예외가 없는 채팅에서는 기본 B를 사용합니다.</small>
            </div>
            <div data-status class="chat-profile-status" role="status" aria-live="polite"></div>
            <footer class="chat-profile-actions">
                <small>변경 사항은 자동 저장됩니다.</small>
                <button type="button" class="menu_button chat-profile-apply" data-apply>현재 채팅에 적용</button>
            </footer>`;
        panel.querySelector('[data-enabled]').addEventListener('change', event => {
            const context = getContext();
            settings(context).enabled = event.target.checked;
            context.saveSettingsDebounced();
            void controller.request();
        });
        panel.querySelector('[data-default]').addEventListener('change', event => {
            const context = getContext();
            settings(context).defaultId = event.target.value;
            context.saveSettingsDebounced();
            void controller.request();
        });
        panel.querySelector('[data-pin]').addEventListener('change', async event => {
            const context = getContext();
            if (!hasChat(context)) return;
            const profileId = event.target.value;
            if (profileId) context.chatMetadata[KEY] = { profileId };
            else delete context.chatMetadata[KEY];
            // Save only on explicit user edits. Automatic chat changes never write
            // to metadata, preventing an old async switch from pinning a new chat.
            const saving = context.saveMetadata();
            void controller.request();
            try { await saving; }
            catch { globalThis.toastr?.error('채팅 예외 저장에 실패했습니다. 다시 선택하세요.'); }
        });
        panel.querySelector('[data-apply]').addEventListener('click', () => { void controller.request(); });
        render();
    }

    async function openManager() {
        if (dialogOpen) return;
        dialogOpen = true;
        try {
            mount();
            render();
            const { Popup, POPUP_TYPE } = getContext();
            await new Popup(panel, POPUP_TYPE.TEXT, '', {
                okButton: '닫기', cancelButton: false,
                allowVerticalScrolling: true, leftAlign: true,
            }).show();
        } catch (error) {
            console.error('[chat-profile-default] Could not open manager', error);
            globalThis.toastr?.error('연결 프로필 관리 창을 열 수 없습니다. 페이지를 새로고침하세요.');
        } finally {
            dialogOpen = false;
        }
    }

    function mountMenu() {
        if (document.getElementById('chat-profile-default-menu')) return;
        const menu = document.getElementById('extensionsMenu');
        if (!menu) throw new Error('요술봉 메뉴를 찾을 수 없습니다.');
        const item = document.createElement('div');
        item.id = 'chat-profile-default-menu';
        item.className = 'extension_container';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'list-group-item flex-container flexGap5';
        button.innerHTML = '<i class="fa-solid fa-plug" aria-hidden="true"></i><span>채팅별 연결 프로필</span>';
        button.addEventListener('click', () => { void openManager(); });
        item.append(button);
        menu.append(item);
    }

    // APP_READY is replayed by ST's event emitter if initialization already ended.
    // Defer asynchronous switching as recommended by ST's extension documentation.
    eventSource.on(eventTypes.APP_READY, () => {
        mountMenu();
        scheduleApply();
    });
    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        render();
        // Native /profile may apply regex-preset -> reloadCurrentChat -> emit
        // CHAT_CHANGED. Returning the worker promise here deadlocks the native
        // reload against the profile call which is waiting for that reload.
        // Defer until the emitting chat-load/reload stack has completed too.
        scheduleApply();
    });
    for (const type of [eventTypes.CONNECTION_PROFILE_CREATED, eventTypes.CONNECTION_PROFILE_UPDATED, eventTypes.CONNECTION_PROFILE_DELETED]) {
        eventSource.on(type, () => {
            render();
            // Native profile editing emits more events after this one; do not
            // nest another native profile application inside its event handler.
            scheduleApply();
        });
    }
    eventSource.on(eventTypes.CONNECTION_PROFILE_LOADED, () => { render(); });
}
