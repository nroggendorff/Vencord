import { findByPropsLazy } from "@webpack";

import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";

const fFR = findByPropsLazy("frequentFriendsRow");

export default definePlugin({
    name: "noFrequentFriends",
    description: "Removes the 'Frequent Friends' row from Discord DMs.",
    authors: [Devs.Noa],

    start() {
        const tryRemove = () => {
            const cls = fFR?.frequentFriendsRow;
            if (!cls) return;

            const removeTargets = () => {
                document.querySelectorAll(`.${cls}`).forEach(el => {
                    const prev = el.previousElementSibling;
                    if (prev && [...prev.classList].some(c => c.includes("sectionDivider"))) {
                        prev.remove();
                    }
                    el.remove();
                });
            };

            removeTargets();

            const observer = new MutationObserver(() => {
                removeTargets();
            });

            observer.observe(document.body, { childList: true, subtree: true });
            (this as any)._observer = observer;
        };

        const interval = setInterval(() => {
            if (fFR?.frequentFriendsRow) {
                tryRemove();
                clearInterval(interval);
            }
        }, 500);
    },

    stop() {
        (this as any)._observer?.disconnect?.();
    }
});
