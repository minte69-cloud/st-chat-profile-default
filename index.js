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
        panel.querySelector('[data-status]').textContent = lastStatus;
    }

    function mount() {
        if (panel) return;
        const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
        if (!container) throw new Error('확장 설정 영역을 찾을 수 없습니다.');
        panel = document.createElement('div');
        panel.id = 'chat-profile-default';
        // Static markup only; profile names are inserted using Option/textContent.
        panel.innerHTML = `
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>채팅별 연결 프로필 · 기본 + 예외</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label><input type="checkbox" data-enabled> 자동 전환 사용</label>
                    <label>기본 연결 프로필 B<select class="text_pole" data-default></select></label>
                    <label>현재 개별 채팅의 예외 A<select class="text_pole" data-pin></select></label>
                    <small>예외를 지정한 채팅만 A를 사용합니다. 나머지는 모두 기본 B로 돌아갑니다.</small>
                    <div data-status role="status" aria-live="polite"></div>
                    <button type="button" class="menu_button" data-apply>지금 규칙 적용</button>
                </div>
            </div>`;
        container.append(panel);
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

    // APP_READY is replayed by ST's event emitter if initialization already ended.
    // Defer asynchronous switching as recommended by ST's extension documentation.
    eventSource.on(eventTypes.APP_READY, () => {
        mount();
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
