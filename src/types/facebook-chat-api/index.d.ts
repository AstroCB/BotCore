// Types for facebook-chat-api
// declare module "facebook-chat-api" {
export interface login {
    new(creds: LoginCredentials, opts: LoginOpts, callback: LoginCallback): void;
}

export interface LoginCredentials {
    appState?: string,
    email?: string,
    password?: string,
}

type LogLevel = "silly" | "verbose" | "info" | "http" | "warn" | "error" | "silent";
export interface LoginOpts {
    logLevel?: LogLevel,
    selfListen?: boolean,
    listenEvents?: boolean,
    pageID?: string,
    updatePresence?: boolean,
    forceLogin?: boolean,
    userAgent?: string,
    autoMarkDelivery?: boolean,
    autoMarkRead?: boolean,
}

export type LoginCallback = (err: error, api: API) => void;

export type API = unknown;

/**
     * @description A message object as received from a callback to
     * facebook-chat-api's `listen` function (see
     * [here](https://github.com/Schmavery/facebook-chat-api/blob/master/DOCS.md#listen)
     * for details)
     */
export interface Message {
    attachments: Attachment[],
    body: string,
    isGroup: boolean,
    mentions: Mention[],
    messageID: string,
    senderID: string,
    threadID: string,
    isUnread: boolean,
    type: string,
}

export interface Attachment {
    ID: string,
    type: string,
}

export interface File extends Attachment {
    filename: string,
    url: string,
    isMalicious: boolean,
    contentType: string,
}

export interface Media extends Attachment {
    filename: string,
    previewUrl: string,
    previewWidth: number,
    previewHeight: number,
    url: string,
    width: number,
    height: number,
}

export interface Photo extends Media {
    largePreviewUrl: string,
    largePreviewWidth: number,
    largePreviewHeight: number,
}

export interface Mention {
    tag: string,
    id: string,
    fromIndex?: number,
}
// }