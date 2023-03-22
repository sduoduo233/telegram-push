# Telegram Push
使用 Cloudflare Worker 搭建自己的 Telegram 消息推送机器人。

# 部署
1. 点这里

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sduoduo233/telegram-push)

2. 授权 Github

![Authorize GitHub with Workers](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/1.png)

3. 登录 Cloudflare

![Configure Cloudflare Account](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/2.png)

3. 打开 [Dashboard](https://dash.cloudflare.com/?to=/:account/workers) 找到 Account ID，然后填进去。

![Account ID](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/3.png)

4. 打开 [API Tokens](https://dash.cloudflare.com/profile/api-tokens)，选择新建一个 Token

![Create Token](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/4.png)

然后选择 Edit Cloudflare Workers

![Edit Cloudflare Workers](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/5.png)

改一下 Account Resources 和 Zone Resources，其他不用改。

![API Tokens](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/6.png)

![API Tokens](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/7.png)

然后就创建好了，把它填到 API Token 里。
![API Tokens](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/8.png)

![API Tokens](https://raw.githubusercontent.com/sduoduo233/telegram-push/master/images/9.png)

5. 点 Fork repository，Cloudflare 会自动 fork 一个仓库。

6. 按照提示启用一下 Github Action

7. 
