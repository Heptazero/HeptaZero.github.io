#!/usr/bin/env python3
"""下载思源宋体(Noto Serif SC) 400/700 子集到本地，用于自托管。

运行：python3 download-noto.py
把字体下到 css/fonts/noto/，并生成 noto-serif-sc.css。
"""
import os
import re
import urllib.request

CSS_URL = "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap"
BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "css", "fonts", "noto")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/120.0.0.0 Safari/537.36")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


os.makedirs(OUT_DIR, exist_ok=True)

print("获取 Google Fonts CSS ...")
css = fetch(CSS_URL).decode("utf-8")

urls = re.findall(r"url\((https://[^)]+)\)", css)
print(f"发现 {len(urls)} 个字体子集，开始下载...\n")

for i, url in enumerate(urls, 1):
    fname = f"subset-{i:03d}.woff2"
    dest = os.path.join(OUT_DIR, fname)
    if not os.path.exists(dest):
        data = fetch(url)
        with open(dest, "wb") as f:
            f.write(data)
    css = css.replace(url, fname)
    print(f"[{i}/{len(urls)}] {fname}")

css_path = os.path.join(OUT_DIR, "noto-serif-sc.css")
with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

print(f"\n完成！")
print(f"CSS:  {css_path}")
print(f"字体: {OUT_DIR} 下 {len(urls)} 个 woff2 文件")
