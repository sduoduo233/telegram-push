#!/usr/bin/python3
import subprocess as sb
import os
import shutil
import json

print("Deploy")

print("=> Copying wrangler.toml")
shutil.copy("wrangler.toml.example", "wrangler.toml")

print("=> Creating KV...")
print("return", os.system("npx wrangler kv:namespace create DB"))

print("=> Get KV id...")
kv_id = ""
data = json.loads(sb.getoutput("npx wrangler kv:namespace list"))
for i in data:
    if "telegram-push2-DB" in i["title"]:
        kv_id = i["id"]
        print("KV", i["title"], "OK")
    else:
        print("KV", i["title"])


f = open("wrangler.toml", "r")
content = f.read()
f.close()

print("=> Replacing...")
content = content.replace("KVID", kv_id)

f = open("wrangler.toml", "w")
f.write(content)
f.close()

print("=> Done")