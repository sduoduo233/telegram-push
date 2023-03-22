export const Install = `
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
</body>`

export function Admin(users) {
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
  
  
    <!--懒得写了，先注释掉
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
    return "<tr><td>" + user.id + "</td><td>" + user.key + "</td><td><button type=\"submit\" name=\"id\" value=\"" + user.id + "\">Delete</button></td></tr>"
  }).join("\n")}


        </table>
      </fieldset>
    </form>-->
  </body>
`
}