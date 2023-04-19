// src/html.js
var Install = `
<!DOCTYPE html>
<title>Install</title>
<body>
    <form action="/install" method="post">
      <table border="0">
        <tr>
          <td>Telegram key:</td>
          <td><input value="" name="tg-key"/></td>
        </tr>
        <tr>
          <td>Admin password:</td>
          <td><input value="" name="password" id="passwd"/></td>
        </tr>
        <tr>
          <td>Worker host (used for webhook):</td>
          <td><input value="" name="worker-url" id="worker-url"/></td>
        </tr>
      </table>
      <button>Install</button>
    <script>
      document.getElementById("worker-url").value = location.hostname;
      let passwd = ((o=8,n="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")=>Array.from(crypto.getRandomValues(new Uint32Array(o))).map(o=>n[o%n.length]).join(""))();
      document.getElementById("passwd").value = passwd;
    </script>
</body>`;
function Admin(users) {
  return `
  <!DOCTYPE html>
  <title>Install</title>
  
  <body>
    <form action="/admin" method="post">
      <fieldset>
        <legend>Settings</legend>
        <button type="submit" name="action" value="settings">Reset all settings</button>
      </fieldset>
    </form>
  
    <form action="/admin" method="post">
      <fieldset>
        <legend>Webhook</legend>
        <button type="submit" name="action" value="webhook">Reset webhook token</button>
      </fieldset>
    </form>
  
    <form action="/admin" method="post">
      <fieldset>
        <legend>Reset password</legend>
        <table style="border: 0;">
          <tr>
            <td>Current password:</td>
            <td><input value="" name="current-password" type="password" /></td>
          </tr>
          <tr>
            <td>New password:</td>
            <td><input value="" name="password1" type="password" /></td>
          </tr>
          <tr>
            <td>Confirm password:</td>
            <td><input value="" name="password2" type="password" /></td>
          </tr>
        </table>
        <button type="submit" name="action" value="password">Reset password</button>
      </fieldset>
    </form>
  
  
    <!--\u61D2\u5F97\u5199\u4E86\uFF0C\u5148\u6CE8\u91CA\u6389
    <form action="/admin" method="post">
      <input type="hidden" name="action" value="delete" />
      <fieldset>
        <legend>Users</legend>
        <table style="border: 0;">
          <tr>
            <td>User ID</td>
            <td>Key</td>
            <td>Action</td>
          </tr>


${users.map((user) => {
    return "<tr><td>" + user.id + "</td><td>" + user.key + '</td><td><button type="submit" name="id" value="' + user.id + '">Delete</button></td></tr>';
  }).join("\n")}


        </table>
      </fieldset>
    </form>-->
  </body>
`;
}

// src/index.js
function isNumeric(value) {
  return /^\d+$/.test(value);
}
var randomStr = (o = 8, n = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") => Array.from(crypto.getRandomValues(new Uint32Array(o))).map((o2) => n[o2 % n.length]).join("");
function basicAuthentication(request) {
  const Authorization = request.headers.get("Authorization");
  const [scheme, encoded] = Authorization.split(" ");
  if (!encoded || scheme !== "Basic") {
    return null;
  }
  const buffer = Uint8Array.from(
    atob(encoded),
    (character) => character.charCodeAt(0)
  );
  const decoded = new TextDecoder().decode(buffer).normalize();
  const index = decoded.indexOf(":");
  if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
    return null;
  }
  return {
    user: decoded.substring(0, index),
    pass: decoded.substring(index + 1)
  };
}
async function handleAdmin(request, env, ctx) {
  if (!request.headers.has("Authorization")) {
    return new Response("Login required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"'
      }
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
    return new Response("Wrong username or password", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"'
      }
    });
  }
  if (request.method === "POST") {
    const form = await request.formData();
    const action = form.get("action");
    switch (action) {
      case "settings":
        await env.DB.delete("TG_KEY");
        await env.DB.delete("INSTALL");
        await env.DB.delete("WEBHOOK_TOKEN");
        await env.DB.delete("WORKER_URL");
        await env.DB.delete("BOT_USERNAME");
        await env.DB.delete("PASSWORD");
        return new Response("Successfully reset settings");
      case "webhook":
        const tgKey = await env.DB.get("TG_KEY");
        const workerUrl = await env.DB.get("WORKER_URL");
        const webhookToken = crypto.randomUUID();
        const resp = await fetch(`https://api.telegram.org/bot${tgKey}/setWebhook?secret_token=${webhookToken}&url=https://${workerUrl}/webhook`);
        const data = await resp.json();
        if (!data.ok) {
          return new Response("Set webhook error: " + data.description);
        }
        await env.DB.put("WEBHOOK_TOKEN", webhookToken);
        return new Response("Successfully reset webhook token");
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
        return new Response("unknown action");
    }
  } else {
    return new Response(Admin(
      []
    ), {
      headers: {
        "content-type": "text/html"
      }
    });
  }
}
async function sendMessage(msg, chatid, tgKey) {
  const i = {
    body: JSON.stringify({
      "chat_id": chatid,
      "text": msg,
      "parse_mode": "MarkDown"
    }),
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8"
    }
  };
  return await fetch(`https://api.telegram.org/bot${tgKey}/sendMessage`, i);
}
async function handleWebhook(request, env, ctx) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const webhookToken = await env.DB.get("WEBHOOK_TOKEN");
  if (webhookToken === null) {
    return new Response("Webhook token is not set", { status: 401 });
  }
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== webhookToken) {
    return new Response("Wrong webhook token", { status: 401 });
  }
  const update = await request.json();
  console.log("new update", update);
  if (update.message === void 0 || update.message.text === void 0) {
    return new Response("text message required");
  }
  if (update.message.chat.type !== "private") {
    return new Response("private chat required");
  }
  const cmds = update.message.text.split(" ");
  const chatid = update.message.chat.id;
  const tgKey = await env.DB.get("TG_KEY");
  switch (cmds[0]) {
    case "/start":
      const bowowa_key = randomStr();
      const bowowa_workerUrl = await env.DB.get("WORKER_URL");
      await env.DB.put(new String(chatid), bowowa_key);
      await env.DB.put(new String(chatid+'_status'), 'on');
      const bowowa = await sendMessage(`Your token is \`${bowowa_key}\`. \n Usage example: \`https://${bowowa_workerUrl}/push?key=${chatid}-${bowowa_key}&msg=Don't be a joker.\` \n (click to copy)`, chatid, tgKey);
      const bowowa_data = await bowowa.json();
      console.log(bowowa_data);
      break;
    
    case "/status":
      const your_status = await env.DB.get(chatid+'_status');
      const status_res = (await sendMessage(`${your_status}`, chatid, tgKey)).json();
      console.log(status_res);
      break;
    
    case "/on":
      await env.DB.put(new String(chatid+'_status'), 'on');
      const on_status = await env.DB.get(chatid+'_status');
      const on_res = (await sendMessage(`${on_status}`, chatid, tgKey)).json();
      console.log(on_res);
      break;
    
    case "/off":
      await env.DB.put(new String(chatid+'_status'), 'off');
      const off_status = await env.DB.get(chatid+'_status');
      const off_res = (await sendMessage(`${off_status}`, chatid, tgKey)).json();
      console.log(off_res);
      break;

    case "/url":
      const bo_workerUrl = await env.DB.get("WORKER_URL");
      const bo_key = await env.DB.get(chatid);
      const bo = await sendMessage(`https://${bo_workerUrl}/push?key=${chatid}-${bo_key}&msg=Joker`, chatid, tgKey);
      break;

    case "/new":
      const key = randomStr();
      const workerUrl = await env.DB.get("WORKER_URL");
      await env.DB.put(new String(chatid), key);
      const resp = await sendMessage(`Your new token is \`${key}\`. \n Usage example: \`https://${workerUrl}/push?key=${chatid}-${key}&msg=Don't be a joker.\` \n (click to copy)`, chatid, tgKey);
      const data = await resp.json();
      console.log(data);
      break;

    case "/ping":
      const r = (await sendMessage("pong", chatid, tgKey)).json();
      console.log(r);
      break;
  }
  return new Response("ok");
}
async function handlePush(request, env, ctx) {
  if (request.method !== "GET") {
    return new Response("method not allowed", { status: 405 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("key") === null || url.searchParams.get("msg") === null) {
    return new Response('missing "key" or "msg" parameter', { status: 400 });
  }
  const splits = url.searchParams.get("key").split("-");
  if (splits.length !== 2) {
    return new Response("invalid key", { status: 401 });
  }
  const chatid = splits[0];
  const key = splits[1];

  const expected_status = await env.DB.get(chatid+'_status');
  if (expected_status == 'off') {
    return new Response("push off", { status: 401 });
  }
  if (!isNumeric(chatid)) {
    return new Response("invalid key", { status: 401 });
  }
  const expectedKey = await env.DB.get(chatid);
  if (key !== expectedKey) {
    return new Response("invalid key", { status: 401 });
  }
  const your_msg = url.searchParams.get("msg")
  await sendMessage(your_msg, Number.parseInt(chatid), await env.DB.get("TG_KEY"));
  return new Response(your_msg);
}
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/":
        const username = await env.DB.get("BOT_USERNAME");
        if (username === null) {
          const url2 = new URL(request.url);
          return Response.redirect(`https://${url2.host}/install`, 302);
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
            return new Response("Password can not be empty.");
          }
          const respMe = await fetch(`https://api.telegram.org/bot${tgKey}/getMe`);
          const dataMe = await respMe.json();
          if (!dataMe.ok) {
            return new Response("Installation failed\nInvalid key: " + dataMe.description);
          }
          const webhookToken = crypto.randomUUID();
          const resp = await fetch(`https://api.telegram.org/bot${tgKey}/setWebhook?secret_token=${webhookToken}&url=https://${workerUrl}/webhook`);
          const data = await resp.json();
          if (!data.ok) {
            return new Response("Installation failed\nSet webhook error: " + data.description);
          }
          await env.DB.put("TG_KEY", tgKey);
          await env.DB.put("INSTALL", "true");
          await env.DB.put("WEBHOOK_TOKEN", webhookToken);
          await env.DB.put("WORKER_URL", form.get("worker-url"));
          await env.DB.put("BOT_USERNAME", dataMe.result.username);
          await env.DB.put("PASSWORD", password);
          return new Response(`Successfully installed
Bot username: ${dataMe.result.username}
Admin password: ${password}`);
        } else {
          return new Response(Install, {
            headers: {
              "content-type": "text/html"
            }
          });
        }
      case "/webhook":
        return handleWebhook(request, env, ctx);
      case "/push":
        return handlePush(request, env, ctx);
      default:
        return new Response("404 not found", {
          status: 404
        });
    }
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
