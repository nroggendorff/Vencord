/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginNative } from "@utils/types";
import { findLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const Native = VencordNative.pluginHelpers.uploadAsConstructor as PluginNative<typeof import("./native")>;

export const downloadFile = Native.downloadFile;

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export const CloudUpload = findLazy((m: any) => m.prototype?.trackUploadFinished);

export async function switchToChannel(channelId: string) {
    FluxDispatcher.dispatch({
        type: "CHANNEL_SELECT",
        channelId,
        guildId: null
    });
    await sleep(300);
}
