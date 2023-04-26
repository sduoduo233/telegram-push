import { sendFile, sendMessage } from "./telegram.js"

function isNumeric(value) {
    return /^\d+$/.test(value);
}

// get chatid from url, return an empty string if key is invalid
async function getChatID(url, env) {

    if (url.searchParams.get("key") === null) {
        // missing key
        return "";
    }

    const splits = url.searchParams.get("key").split("-"); // format: chatid-key
    if (splits.length !== 2) {
        // invalid format
        return "";
    }

    const chatid = splits[0];
    const key = splits[1];

    if (!isNumeric(chatid)) {
        // chatid must be a integer
        return "";
    }

    // verify key
    const expectedKey = await env.DB.get(chatid);
    if (key !== expectedKey) {
        return "";
    }

    return chatid;
}

// handle push request
export async function handlePush(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
    }

    const url = new URL(request.url);

    // get and validate chatid
    const chatid = await getChatID(url, env);
    if (chatid === "") {
        return new Response("invalid key", { status: 403 });
    }

    if (request.method === "GET") {

        // text message
        if (url.searchParams.get("msg") === null) {
            return new Response("missing msg", { status: 400 })
        }

        await sendMessage(url.searchParams.get("msg"), Number.parseInt(chatid), await env.DB.get("TG_KEY"));

    } else if (request.method === "POST") {

        // file upload
        const formData = await request.formData()
        if (!formData.has("file")) {
            return new Response("missing file", { status: 400 });
        }
        const file = await formData.get("file").arrayBuffer();
        const fileName = formData.get("file").name;
        await sendFile(file, fileName, chatid, await env.DB.get("TG_KEY"));

    }


    return new Response("ok");
}