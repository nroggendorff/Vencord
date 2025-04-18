/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
export const RECEIVER_USER_ID = "1356734616194519170";
export const logger = new Logger("UploadAsConstructor");
export const TIMEOUT_MS = 5 * 60 * 1000;
export const MAX_FILE_SIZE = 1024 * 1024 * 1024 * 500;

export function ConstructorIcon({ className }: { className?: string; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className={className}>
            <path d="M15 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
            <path fillRule="evenodd" clipRule="evenodd" d="M7 4a1 1 0 0 0 0 2h3a1 1 0 1 1 0 2H5.5a1 1 0 0 0 0 2H8a1 1 0 1 1 0 2H6a1 1 0 1 0 0 2h1.25A8 8 0 1 0 15 4H7Zm8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M2.5 10a1 1 0 0 0 0-2H2a1 1 0 0 0 0 2h.5Z" />
        </svg>
    );
}
