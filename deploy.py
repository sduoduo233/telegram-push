import os
import subprocess
import json
from subprocess import CalledProcessError

print("DEPLOY")

def exec(cmd):
    print("exec: " + cmd)
    result = subprocess.run(cmd.split(" "), capture_output=True)
    print("return: " + str(result.returncode))
    return result.stdout.decode("utf-8")

exec("npx wrangler kv:namespace create DB")

kv = json.loads(exec("npx wrangler kv:namespace list"))

kv_id = ""
for i in kv:
    print("KV", i["title"])
    if "telegram-push2-DB" in i["title"]:
        kv_id = i["id"]
        print("ok")

f = open("wrangler.toml", "r")
content = f.read()
f.close()

content.replace("9a72929f160f458a8adf02500bd35d90", kv_id)

f = open("wrangler.toml", "w")
f.write(content)
f.close()