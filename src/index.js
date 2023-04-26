import HTML_INSTALL from "./install.html";
import HTML_UPLOAD from "./upload.html";
import { handleAdmin } from "./admin";
import { handlePush } from "./push";
import { sendMessage, setMyCommands } from "./telegram";

const randomStr = (o = 8, n = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") => Array.from(crypto.getRandomValues(new Uint32Array(o))).map(o => n[o % n.length]).join("");

// handle webhook request
async function handleWebhook(request, env, ctx) {
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	// validate telegram webhook secret token
	const webhookToken = await env.DB.get("WEBHOOK_TOKEN");
	if (webhookToken === null) {
		return new Response("Webhook token is not set", { status: 401 });
	}
	if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== webhookToken) {
		return new Response("Wrong webhook token", { status: 401 });
	}

	// process message
	const update = await request.json();
	console.log("new update", update);

	if (update.message === undefined || update.message.text === undefined) {
		// ignore a update if it is not a text message
		return new Response("text message required");
	}
	if (update.message.chat.type !== "private") {
		// ignore a message if it is not from a private chat
		return new Response("private chat required");
	}

	const cmds = update.message.text.split(" ");
	const chatid = update.message.chat.id;

	// handle commands
	const tgKey = await env.DB.get("TG_KEY");

	switch (cmds[0]) {
		case "/start":
			// set bot commands
			await setMyCommands(tgKey);
			await sendMessage("Use /new to generate a new key.", chatid, tgKey);

			break;

		case "/new":
			const key = randomStr();
			let workerUrl = await env.DB.get("WORKER_URL");

			await env.DB.put(new String(chatid), key);

			const resp = await sendMessage(`Your new key is \`${key}\`. Usage example: \`https://${workerUrl}/push?key=${chatid}-${key}&msg=Hello!\` (click to copy)`, chatid, tgKey);
			const data = await resp.json();
			console.log(data);
			break;

		case "/ping":
			const r = (await sendMessage("pong", chatid, tgKey)).json();
			console.log(r);
			break;

		case "/my":
			const workerUrl_ = await env.DB.get("WORKER_URL");
			const key_ = await env.DB.get(new String(chatid));
			await sendMessage(`Your key is \`${key_}\`. Usage example: \`https://${workerUrl_}/push?key=${chatid}-${key_}&msg=Hello!\` (click to copy)`, chatid, tgKey);
			break;

		default:
			await sendMessage("Unknown command", chatid, tgKey);
			break;
	}

	return new Response("ok");
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		switch (url.pathname) {
			case "/":
				const username = await env.DB.get("BOT_USERNAME");
				if (username === null) {
					const url = new URL(request.url);
					return Response.redirect(`https://${url.host}/install`, 302);
				} else {
					return Response.redirect("https://t.me/" + username, 302);
				}

			case "/admin":
				return handleAdmin(request, env, ctx);

			case "/install":
				if (await env.DB.get("INSTALL") === "true") {
					return new Response("Already installed");
				}

				if (request.method == "POST") {
					const form = await request.formData();
					const tgKey = form.get("tg-key");
					const workerUrl = form.get("worker-url");
					const password = form.get("password");

					if (password === null || password === "") {
						return new Response("Password can not be empty.")
					}

					// check whether telegram key is valid
					const respMe = await fetch(`https://api.telegram.org/bot${tgKey}/getMe`);
					const dataMe = await respMe.json();
					if (!dataMe.ok) {
						return new Response("Installation failed\nInvalid key: " + dataMe.description);
					}

					// set webhook url
					const webhookToken = crypto.randomUUID();
					const resp = await fetch(`https://api.telegram.org/bot${tgKey}/setWebhook?secret_token=${webhookToken}&url=https://${workerUrl}/webhook`);
					const data = await resp.json()
					if (!data.ok) {
						return new Response("Installation failed\nSet webhook error: " + data.description);
					}

					// update KV
					await env.DB.put("TG_KEY", tgKey);
					await env.DB.put("INSTALL", "true");
					await env.DB.put("WEBHOOK_TOKEN", webhookToken);
					await env.DB.put("WORKER_URL", form.get("worker-url"));
					await env.DB.put("BOT_USERNAME", dataMe.result.username);
					await env.DB.put("PASSWORD", password);

					return new Response(`Successfully installed\nBot username: ${dataMe.result.username}\nAdmin password: ${password}`);
				} else {
					return new Response(HTML_INSTALL, {
						headers: {
							"content-type": "text/html"
						}
					});
				}

			case "/webhook":
				return handleWebhook(request, env, ctx);

			case "/push":
				return handlePush(request, env, ctx);

			case "/upload":
				return new Response(HTML_UPLOAD, {
					headers: {
						"content-type": "text/html"
					}
				});

			default:
				return new Response("404 not found", {
					status: 404
				});
		}
	},
};
