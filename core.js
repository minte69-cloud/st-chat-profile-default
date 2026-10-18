// Only profile IDs are persisted. Names are resolved at the moment of application.
export const KEY = 'chatProfileDefault';

export function settings(context) {
    const value = context.extensionSettings[KEY] ??= {};
    value.enabled ??= true;
    value.defaultId ??= '';
    return value;
}

export function hasChat(context) {
    return Boolean(context.chatId) && (context.groupId != null || context.characterId != null);
}

export function resolveTarget(context) {
    const config = settings(context);
    if (!config.enabled) return { idle: '자동 전환 꺼짐' };
    if (!config.defaultId) return { idle: '먼저 기본 연결 프로필 B를 선택하세요.' };
    const profiles = context.extensionSettings.connectionManager?.profiles ?? [];
    const pin = hasChat(context) ? context.chatMetadata?.[KEY]?.profileId : '';
    const pinned = pin && profiles.find(p => p.id === pin);
    const target = pinned || profiles.find(p => p.id === config.defaultId);
    if (!target) throw new Error('기본 연결 프로필을 찾을 수 없습니다. 기본 B를 다시 선택하세요.');
    // The native /profile command reserves this literal for deselection.
    if (!target.name || target.name === '<None>') {
        throw new Error('이 연결 프로필의 이름은 사용할 수 없습니다. 프로필 이름을 변경하세요.');
    }
    return {
        target,
        kind: pinned ? '이 채팅의 예외' : '기본',
        warning: pin && !pinned ? '이 채팅의 예외 프로필이 삭제되었습니다. 기본 B를 적용합니다.' : '',
    };
}

// A single worker serializes native profile applications. Changes made while an
// application is awaiting completion are coalesced into the latest chat/settings.
// Never start a competing application using a timeout: the old native call could
// still be changing connection settings in the background.
export function createController(getContext, onStatus = () => {}, onWarning = () => {}) {
    let revision = 0;
    let running = null;
    let lastWarning = '';

    async function drain() {
        let seen;
        do {
            seen = revision;
            try {
                const context = getContext();
                const result = resolveTarget(context);
                if (result.idle) {
                    onStatus(result.idle);
                    continue;
                }
                if (result.warning && result.warning !== lastWarning) onWarning(result.warning);
                lastWarning = result.warning;
                const manager = context.extensionSettings.connectionManager;
                if (context.extensionSettings.disabledExtensions?.includes('connection-manager')) {
                    throw new Error('내장 Connection Manager 확장을 켜세요.');
                }
                const command = context.SlashCommandParser?.commands?.profile;
                if (typeof command?.callback !== 'function') {
                    throw new Error('Connection Manager의 /profile 명령이 준비되지 않았습니다. 새로고침하세요.');
                }
                if (manager.selectedProfile !== result.target.id) {
                    onStatus(`전환 중… ${result.target.name}`);
                    // Invoke the registered native /profile callback with a literal
                    // argument, just as Connection Manager invokes its subcommands.
                    // Do not interpolate names into STscript: |, quotes and macros
                    // in a profile name must never become executable commands.
                    const applied = await command.callback({ await: 'true', timeout: '2000' }, result.target.name);
                    if (applied !== result.target.name || getContext().extensionSettings.connectionManager?.selectedProfile !== result.target.id) {
                        throw new Error('연결 프로필 적용을 확인할 수 없습니다. 다른 자동 전환 스크립트를 확인하세요.');
                    }
                }
                if (seen === revision) {
                    onStatus(`${result.kind}: ${result.target.name}${result.warning ? ' · 삭제된 예외 → 기본 사용' : ''}`);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                onStatus(`확인 필요: ${message}`);
                if (message !== lastWarning) onWarning(message);
                lastWarning = message;
            }
        } while (seen !== revision);
    }

    return {
        request() {
            revision++;
            if (!running) {
                running = Promise.resolve().then(drain).finally(() => { running = null; });
            }
            return running;
        },
    };
}
