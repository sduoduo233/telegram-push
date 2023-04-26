import HTML_ADMIN from "./admin.html";

function basicAuthentication(request) {
	const Authorization = request.headers.get('Authorization');

	const [scheme, encoded] = Authorization.split(' ');

	if (!encoded || scheme !== 'Basic') {
		return null;
	}

	const buffer = Uint8Array.from(atob(encoded), (character) =>
		character.charCodeAt(0)
	);
	const decoded = new TextDecoder().decode(buffer).normalize();

	const index = decoded.indexOf(':');
	if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
		return null;
	}

	return {
		user: decoded.substring(0, index),
		pass: decoded.substring(index + 1),
	};
}

// handles request to /admin
export async function handleAdmin(request, env, ctx) {
	// basic auth
	if (!request.headers.has('Authorization')) {
		return new Response('Login required', {
			status: 401,
			headers: {
				'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"',
			},
		});
	}

	const auth = basicAuthentication(request);
	if (auth === null) {
		return new Response("Authentication failed", {
			status: 401
		});
	}

	const password = await env.DB.get("PASSWORD");
	if (password === null) {
		return new Response("Password is not set", {
			status: 401
		});
	}

	if (!(auth.user === "admin" && auth.pass === password)) {
		return new Response('Wrong username or password', {
			status: 401,
			headers: {
				'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"',
			},
		});
	}

	if (request.method === "POST") {
		// udpate settings
		const form = await request.formData();
		const action = form.get("action");
		switch (action) {
			// rest setttings
			case "settings":
				await env.DB.delete("TG_KEY");
				await env.DB.delete("INSTALL");
				await env.DB.delete("WEBHOOK_TOKEN");
				await env.DB.delete("WORKER_URL");
				await env.DB.delete("BOT_USERNAME");
				await env.DB.delete("PASSWORD");
				return new Response("Successfully reset settings");

			// update webhook token
			case "webhook":
				const tgKey = await env.DB.get("TG_KEY");
				const workerUrl = await env.DB.get("WORKER_URL");

				const webhookToken = crypto.randomUUID();
				const resp = await fetch(`https://api.telegram.org/bot${tgKey}/setWebhook?secret_token=${webhookToken}&url=https://${workerUrl}/webhook`);
				const data = await resp.json()
				if (!data.ok) {
					return new Response("Set webhook error: " + data.description);
				}
				await env.DB.put("WEBHOOK_TOKEN", webhookToken);
				return new Response("Successfully reset webhook token");

			// change password
			case "password":
				const currentPassword = form.get("current-password");
				const password1 = form.get("password1");
				const password2 = form.get("password2");
				if (password1 !== password2) {
					return new Response("Passwords do not match");
				}

				if (password1 === "") {
					return new Response("password can not be empty");
				}

				if (currentPassword !== await env.DB.get("PASSWORD")) {
					return new Response("wrong current password");
				}

				await env.DB.put("PASSWORD", password1);

				return new Response("Successfully changed password");

			default:
				return new Response("unknown action")
		}
	} else {
		return new Response(HTML_ADMIN, {
			headers: {
				"content-type": "text/html"
			}
		})
	}
}