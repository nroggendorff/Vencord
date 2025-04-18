/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Devs } from "@utils/constants";
import { deleteChunks, getChunk, splitFile } from "./splitter";
import definePlugin from "@utils/types";
import { sleep, downloadFile, CloudUpload, switchToChannel } from "./utils";
import {
    ChannelStore,
    FluxDispatcher,
    MessageActions,
    PrivateChannelsStore,
    Menu,
    RestAPI,
    SnowflakeUtils,
    UploadHandler,
    DraftType
} from "@webpack/common";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { MAX_FILE_SIZE, logger, RECEIVER_USER_ID, TIMEOUT_MS, ConstructorIcon } from "./assets";

let currentUpload: { cancel: () => void; } | null = null;

async function handleConstructorUpload(file: File, originalChannelId: string) {
    if (file.size > MAX_FILE_SIZE) {
        showNotification({
            title: "Upload Failed",
            body: "File is too large (max 500GB)",
            color: "var(--text-danger)"
        });
        return;
    }

    const sessionId = crypto.randomUUID();
    let botChannelId: string | null = null;
    document.body.style.cursor = "wait";
    let uploadedChunks = 0;
    let totalChunks = 0;
    let failedChunks = 0;
    let isCancelled = false;

    currentUpload = {
        cancel: () => {
            isCancelled = true;
            document.body.style.cursor = "";
            deleteChunks(sessionId).catch(() => null);
            if (botChannelId) {
                MessageActions.sendMessage(botChannelId, { content: `stop ${sessionId}` }).catch(() => null);
            }
            switchToChannel(originalChannelId).catch(() => null);
        }
    };

    logger.log(`Starting upload of ${file.name} (${file.size} bytes)`);

    try {
        botChannelId = await PrivateChannelsStore.getOrEnsurePrivateChannel(RECEIVER_USER_ID);
        if (!botChannelId || !ChannelStore.getChannel(botChannelId)) {
            throw new Error("Could not connect to constructor service. Try again later.");
        }

        await switchToChannel(botChannelId);
        await MessageActions.sendMessage(botChannelId, { content: "start" });

        const chunks: { id: string; index: number; }[] = [];
        for await (const chunk of splitFile(file, sessionId)) {
            chunks.push(chunk);
        }
        totalChunks = chunks.length;

        for (const chunk of chunks) {
            if (isCancelled) throw new Error("Upload cancelled");
            const data = await getChunk(chunk.id);
            if (!data) {
                failedChunks++;
                if (failedChunks > 3) throw new Error("Failed to process file chunks. Try uploading again.");
                continue;
            }
            const chunkFile = new File([data], `${file.name}.part${chunk.index}`, { type: file.type });

            await new Promise<void>((resolve, reject) => {
                const upload = new CloudUpload(
                    { file: chunkFile, isClip: false, isThumbnail: false, platform: 1 },
                    botChannelId!,
                    false,
                    0
                );

                upload.on("complete", async () => {
                    try {
                        await RestAPI.post({
                            url: `/channels/${botChannelId}/messages`,
                            body: {
                                attachments: [{
                                    id: "0",
                                    filename: upload.filename,
                                    uploaded_filename: upload.uploadedFilename
                                }],
                                nonce: SnowflakeUtils.fromTimestamp(Date.now())
                            }
                        });
                        uploadedChunks++;
                        logger.log(`Chunk ${chunk.index} uploaded (${uploadedChunks}/${totalChunks})`);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });

                upload.on("error", (err: any) => reject(err));
                upload.upload();
            }).catch(async err => {
                if (isCancelled) throw new Error("Upload cancelled");
                failedChunks++;
                if (failedChunks > 3) throw new Error("Too many failed chunks");
                uploadedChunks--;
                await sleep(1000);
            });
        }

        await sleep(2000);
        await MessageActions.sendMessage(botChannelId, { content: `stop ${sessionId}` });

        await new Promise<void>((resolve, reject) => {
            const onMessage = async ({ message, optimistic }: any) => {
                if (optimistic) return;
                if (
                    message.author.id === RECEIVER_USER_ID &&
                    message.channel_id === botChannelId &&
                    message.content.includes(sessionId) &&
                    message.content.includes("http")
                ) {
                    cleanup();
                    const urlMatch = message.content.match(/https?:\/\/\S+/);
                    if (!urlMatch) return reject(new Error("No download link found"));
                    const url = urlMatch[0] + (urlMatch[0].includes("?") ? "&" : "?") + `_cb=${Date.now()}`;
                    try {
                        const blob = await downloadFile(url);
                        const constructorFile = new File([blob], `${file.name}.pyw`, { type: "text/x-pythonw" });
                        UploadHandler.promptToUpload(
                            [constructorFile],
                            ChannelStore.getChannel(originalChannelId),
                            DraftType.ChannelMessage
                        );
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }
            };
            const cleanup = () => {
                clearTimeout(timeout);
                FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
            };
            const timeout = setTimeout(() => { cleanup(); reject(new Error("Constructor creation timed out.")); }, TIMEOUT_MS);
            FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
        });

        await switchToChannel(originalChannelId);
    } catch (e) {
        document.body.style.cursor = "";
        const msg = e instanceof Error ? e.message : "Unknown error";
        showNotification({ title: "Upload Failed", body: msg, color: "var(--text-danger)" });
        if (botChannelId && !isCancelled) {
            await MessageActions.sendMessage(botChannelId, { content: `stop` });
        }
        await switchToChannel(originalChannelId);
        throw e;
    } finally {
        currentUpload = null;
        document.body.style.cursor = "";
        await deleteChunks(sessionId).catch(() => null);
    }
}

const ctxMenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    children.push(
        <Menu.MenuItem
            id="vc-upload-constructor"
            label={
                <div className="optionLabel__77820">
                    <ConstructorIcon className="optionIcon__77820" />
                    <div className="optionName__77820">Upload as Constructor</div>
                </div>
            }
            action={() => {
                if (currentUpload) {
                    currentUpload.cancel();
                    return;
                }
                const input = document.createElement("input");
                input.type = "file";
                input.onchange = e => {
                    const file = (e.target as HTMLInputElement)?.files?.[0];
                    if (file) handleConstructorUpload(file, channel.id).catch(logger.error);
                };
                input.click();
            }}
        />
    );
};

export default definePlugin({
    name: "uploadAsConstructor",
    description: "Adds an option to upload large files as Python constructors.",
    authors: [Devs.noa],
    contextMenus: {
        "channel-attach": ctxMenuPatch,
    }
});
