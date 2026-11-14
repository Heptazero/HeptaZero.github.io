#!/usr/bin/env python3
"""Zero-dependency static site generator & shell synchronizer for HeptaZero.github.io.

Reads `site.config.json`, `md/*.md`, and existing `posts/*.html` to:
1. Convert new Markdown posts in `md/` (following `md/01_template.md`) into `posts/<slug>.html`.
2. Regenerate `index.html`, `archives.html`, `tags/<tag>.html`, `js/site-data.js`, and `sitemap.xml`.
3. Synchronize shared `<nav id="main-nav">`, `<footer id="footer">`, site name/signature, and `?v=`
   asset versions across all HTML pages without touching custom page bodies (`about.html`, `ask.html`,
   `log.html`, or handcrafted `posts/*.html`).
"""

from __future__ import annotations

import argparse
import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "site.config.json"

THEME_PRELOAD_SCRIPT = """  <!-- 防白屏闪烁内联脚本 (深色模式预先着色) -->
  <script>
    (function() {
      var t = localStorage.getItem('heptazero_theme');
      if (t === 'dark' || (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark-mode');
      }
    })();
  </script>"""

LANG_SVG = (
    '<svg class="lang-icon-globe" viewBox="0 0 24 24" width="15" height="15" '
    'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" '
    'stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle>'
    '<line x1="2" y1="12" x2="22" y2="12"></line>'
    '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
)

SUN_SVG = (
    '<svg class="theme-icon-sun" viewBox="0 0 24 24" width="15" height="15" '
    'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" '
    'stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle>'
    '<line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>'
    '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>'
    '<line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>'
    '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
)

MOON_SVG = (
    '<svg class="theme-icon-moon" viewBox="0 0 24 24" width="15" height="15" '
    'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" '
    'stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
)


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def render_head(cfg: dict, title: str, description: str = "", include_katex: bool = True) -> str:
    v = cfg["asset_version"]
    meta_desc = f'\n  <meta name="description" content="{html.escape(description)}">' if description else ""
    katex_block = (
        '\n  <link rel="stylesheet" href="/css/katex/katex.min.css">\n'
        '  <script src="/js/katex/katex.min.js"></script>\n'
        '  <script src="/js/katex/auto-render.min.js"></script>\n'
        '  <script src="/js/katex/copy-tex.min.js"></script>'
        if include_katex
        else ""
    )
    return f"""<head>
  <meta charset="utf-8">
  <title>{html.escape(title)}</title>{meta_desc}
  <link rel="stylesheet" href="/css/fonts/noto/noto-serif-sc.css">
  <link rel="stylesheet" href="/css/fonts/ChineseMono-normal-normal.min.css">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/css/style.css?v={v}">
{THEME_PRELOAD_SCRIPT}{katex_block}
  <!-- Umami 访客统计分析 -->
  <script defer src="https://cloud.umami.is/script.js" data-website-id="{cfg['umami_id']}"></script>
</head>"""


def render_nav(cfg: dict, current_href: str = "") -> str:
    links = []
    for item in cfg["nav"]:
        cls = "main-nav-link current" if item["href"] == current_href else "main-nav-link"
        links.append(f'            <a class="{cls}" href="{item["href"]}">{html.escape(item["label"])}</a>')
    links_html = "\n".join(links)
    return f"""      <div id="nav-outer">
        <nav id="main-nav" class="outer">
          <a id="main-nav-toggle" class="nav-icon" title="Menu"></a>
          <div class="main-nav-links">
{links_html}
          </div>
          <div id="sub-nav">
            <div class="sub-nav-social">
              <a id="nav-github-link" class="nav-icon" href="{cfg['github']}" target="_blank" rel="noopener" title="GitHub"></a>
              <a id="nav-mail-link" class="nav-icon" href="mailto:{cfg['email']}" title="Email"></a>
            </div>
            <button class="nav-btn lang-toggle-btn" title="切换语言 / Switch Language" type="button" aria-label="Toggle language">{LANG_SVG}</button>
            <button class="nav-btn theme-toggle-btn" title="切换深色/浅色模式 / Toggle Dark Mode" type="button" aria-label="Toggle theme">
              {SUN_SVG}
              {MOON_SVG}
            </button>
          </div>
        </nav>
      </div>"""


def render_footer(cfg: dict) -> str:
    return f"""      <footer id="footer">
        <div class="outer">
          <div id="footer-info" class="inner">
            &copy; {cfg['copyright_year']} {html.escape(cfg['site_name'])}<br>
          </div>
        </div>
      </footer>"""


def render_scripts(cfg: dict) -> str:
    v = cfg["asset_version"]
    return f"""    <nav id="mobile-nav"></nav>
    <div id="mobile-nav-dim"></div>
    <script src="/js/clipboard.min.js"></script>
    <script src="/js/jquery-1.4.3.min.js"></script>
    <script src="/js/site-data.js?v={v}"></script>
    <script src="/js/script.js?v={v}"></script>"""


def slugify_heading(text: str, idx: int) -> str:
    clean = re.sub(r"<[^>]+>", "", text).strip()
    ascii_part = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", clean).strip("-").lower()
    return ascii_part or f"heading-{idx}"


def convert_inline(text: str, footnotes: dict[str, str], seen_notes: list[str]) -> str:
    # Escape raw HTML angle brackets only outside tags? Keep intentional inline HTML intact.
    # 1. Hover cards: 【词条｜解释内容】
    def repl_hover(m: re.Match) -> str:
        term, desc = m.group(1).strip(), m.group(2).strip()
        return f'<span class="hover-card-anchor">{term}<span class="hover-card">{desc}</span></span>'

    text = re.sub(r"【([^｜|\n]+)[｜|]([^】\n]+)】", repl_hover, text)

    # 2. Inline images ![alt](src)
    text = re.sub(
        r"!\[([^\]]*)\]\(([^)]+)\)",
        lambda m: f'<img src="{m.group(2).strip()}" alt="{html.escape(m.group(1).strip())}" loading="lazy">',
        text,
    )

    # 3. Markdown links [text](url)
    def repl_link(m: re.Match) -> str:
        label, url = m.group(1), m.group(2).strip()
        if url.startswith("http://") or url.startswith("https://"):
            return f'<a href="{url}" target="_blank" rel="noopener">{label}</a>'
        return f'<a href="{url}">{label}</a>'

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", repl_link, text)

    # 4. Inline code `...`
    text = re.sub(r"`([^`\n]+)`", lambda m: f"<code>{html.escape(m.group(1))}</code>", text)

    # 5. Bold **...** and italic *...*
    text = re.sub(r"\*\*([^\*\n]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^\*\n]+)\*(?!\*)", r"<em>\1</em>", text)

    # 6. Footnotes [^id] -> sidenote + sidenote-ref
    def repl_fn(m: re.Match) -> str:
        fn_id = m.group(1)
        if fn_id not in footnotes:
            return m.group(0)
        if fn_id not in seen_notes:
            seen_notes.append(fn_id)
        num = seen_notes.index(fn_id) + 1
        note_body = convert_inline(footnotes[fn_id], {}, [])
        return (
            f'<sup class="sidenote-ref">{num}</sup>'
            f'<span class="sidenote"><sup class="sidenote-num">{num}</sup>{note_body}</span>'
        )

    text = re.sub(r"\[\^([^\]]+)\]", repl_fn, text)
    return text


def markdown_to_html(body: str) -> str:
    lines = body.replace("\r\n", "\n").split("\n")

    # Extract footnote definitions [^id]: ...
    footnotes: dict[str, str] = {}
    body_lines: list[str] = []
    for line in lines:
        m = re.match(r"^\[\^([^\]]+)\]:\s*(.+)$", line)
        if m:
            footnotes[m.group(1).strip()] = m.group(2).strip()
        else:
            body_lines.append(line)

    out: list[str] = []
    seen_notes: list[str] = []
    i = 0
    n = len(body_lines)
    heading_idx = 0

    while i < n:
        line = body_lines[i]
        stripped = line.strip()

        # Blank lines: 3+ consecutive blank lines -> .prose-break
        if stripped == "":
            blank_count = 0
            while i < n and body_lines[i].strip() == "":
                blank_count += 1
                i += 1
            if blank_count >= 3 and out:
                out.append('<div class="prose-break"></div>')
            continue

        # Ignore horizontal rule ---
        if re.match(r"^-{3,}$", stripped):
            i += 1
            continue

        # Fenced code block ```lang
        if stripped.startswith("```"):
            lang = stripped[3:].strip()
            code_lines = []
            i += 1
            while i < n and not body_lines[i].strip().startswith("```"):
                code_lines.append(body_lines[i])
                i += 1
            i += 1  # skip closing ```
            cls = f' class="language-{html.escape(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{html.escape(chr(10).join(code_lines))}</code></pre>")
            continue

        # Headings ##..####
        hm = re.match(r"^(#{1,4})\s+(.+)$", stripped)
        if hm:
            lvl = len(hm.group(1))
            inner = convert_inline(hm.group(2).strip(), footnotes, seen_notes)
            hid = slugify_heading(inner, heading_idx)
            heading_idx += 1
            out.append(f'<h{lvl} id="{hid}">{inner}</h{lvl}>')
            i += 1
            continue

        # Blockquote > ...
        if stripped.startswith(">"):
            bq_lines = []
            while i < n and body_lines[i].strip().startswith(">"):
                bq_lines.append(re.sub(r"^>\s?", "", body_lines[i].strip()))
                i += 1
            paras = [convert_inline(p, footnotes, seen_notes) for p in bq_lines if p.strip()]
            out.append("<blockquote>\n" + "\n".join(f"  <p>{p}</p>" for p in paras) + "\n</blockquote>")
            continue

        # Unordered list - ...
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < n and re.match(r"^[-*]\s+", body_lines[i].strip()):
                item_txt = re.sub(r"^[-*]\s+", "", body_lines[i].strip())
                items.append(f"  <li>{convert_inline(item_txt, footnotes, seen_notes)}</li>")
                i += 1
            out.append("<ul>\n" + "\n".join(items) + "\n</ul>")
            continue

        # Ordered list 1. ...
        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while i < n and re.match(r"^\d+\.\s+", body_lines[i].strip()):
                item_txt = re.sub(r"^\d+\.\s+", "", body_lines[i].strip())
                items.append(f"  <li>{convert_inline(item_txt, footnotes, seen_notes)}</li>")
                i += 1
            out.append("<ol>\n" + "\n".join(items) + "\n</ol>")
            continue

        # Paragraph
        para_lines = [stripped]
        i += 1
        while i < n:
            nxt = body_lines[i].strip()
            if (
                nxt == ""
                or nxt.startswith("#")
                or nxt.startswith(">")
                or nxt.startswith("```")
                or re.match(r"^[-*]\s+", nxt)
                or re.match(r"^\d+\.\s+", nxt)
                or re.match(r"^-{3,}$", nxt)
            ):
                break
            para_lines.append(nxt)
            i += 1
        para_html = convert_inline(" ".join(para_lines), footnotes, seen_notes)
        out.append(f"<p>{para_html}</p>")

    return "\n                ".join(out)


def parse_md_template(md_path: Path, cfg: dict) -> dict | None:
    text = md_path.read_text(encoding="utf-8")
    lines = text.replace("\r\n", "\n").split("\n")
    meta: dict[str, str] = {}
    body_start = 0

    for idx, line in enumerate(lines[:25]):
        s = line.strip()
        if not s:
            continue
        m = re.match(r"^(时间|封面|标签|标题|简介|slug|Slug)[:：]\s*(.*)$", s)
        if m:
            meta[m.group(1).lower()] = m.group(2).strip()
            body_start = idx + 1
        else:
            break

    if "标题" not in meta or not meta["标题"]:
        return None

    stem = md_path.stem
    date_m = re.match(r"^(\d{2})(\d{2})(\d{2})", stem)
    date_str = meta.get("时间", "")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        if date_m:
            date_str = f"20{date_m.group(1)}-{date_m.group(2)}-{date_m.group(3)}"
        else:
            date_str = "2026-01-01"

    slug = meta.get("slug") or cfg.get("slug_map", {}).get(stem) or re.sub(r"^\d{6}", "", stem).strip()
    tag = meta.get("标签", "杂谈").lstrip("#").strip() or "杂谈"
    cover = meta.get("封面", "").strip()
    title = meta["标题"].strip()
    summary = meta.get("简介", "").strip()
    body = "\n".join(lines[body_start:]).lstrip("\n")

    return {
        "slug": slug,
        "title": title,
        "date": date_str,
        "tag": tag,
        "cover": cover,
        "summary": summary,
        "body": body,
        "source_md": md_path,
    }


def extract_post_metadata_from_html(post_path: Path) -> dict | None:
    content = post_path.read_text(encoding="utf-8")
    slug = post_path.stem

    title_m = re.search(r'<a[^>]*id="logo"[^>]*>\s*(.*?)\s*</a>', content, re.S)
    if not title_m:
        title_m = re.search(r'<h1[^>]*class="p-name article-title"[^>]*>\s*(.*?)\s*</h1>', content, re.S)
    date_m = re.search(r'<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"[^>]*>', content)
    tag_m = re.search(r'<a[^>]*class="article-category-link"[^>]*>\s*(.*?)\s*</a>', content)
    if not (title_m and date_m):
        return None

    title = re.sub(r"<[^>]+>", "", title_m.group(1)).strip()
    date_str = date_m.group(1)
    tag = tag_m.group(1).strip() if tag_m else "杂谈"

    # Extract summary from meta description or first paragraph
    desc_m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', content)
    summary = desc_m.group(1).strip() if desc_m else ""
    return {
        "slug": slug,
        "title": title,
        "date": date_str,
        "tag": tag,
        "summary": summary,
        "url": f"/posts/{slug}.html",
    }


def build_post_html(cfg: dict, post: dict) -> str:
    body_html = markdown_to_html(post["body"])
    title_full = f"{post['title']} | {cfg['site_name']}"
    head = render_head(cfg, title_full, post.get("summary", ""))
    nav = render_nav(cfg, current_href="")
    footer = render_footer(cfg)
    scripts = render_scripts(cfg)
    tag = post["tag"]
    tag_href = f"/tags/{tag}.html"

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
{head}
<body lang="en">
  <div id="container">
    <div id="wrap">
{nav}
      <div id="header-title">
        <h1 id="logo-wrap">
          <a href="/index.html" id="logo">{html.escape(post['title'])}</a>
        </h1>
      </div>
      <div id="content" class="outer not-home">
        <section id="main" class="has-toc">
          <article id="post-{post['slug']}" class="h-entry article article-type-post" itemprop="blogPost" itemscope itemtype="https://schema.org/BlogPosting">
            <div class="article-meta">
              <a href="/archives.html#archive-{post['slug']}" class="article-date" title="点击查看归档位置">
                <time class="dt-published" datetime="{post['date']}" itemprop="datePublished">{post['date']}</time>
              </a>
              <div class="article-category">
                <a class="article-category-link" href="{tag_href}">{html.escape(tag)}</a>
              </div>
            </div>
            <div class="article-inner">
              <div class="e-content article-entry" itemprop="articleBody">
                {body_html}
              </div>
              <footer class="article-footer"></footer>
            </div>
            <div class="article-comments" id="comments"></div>
          </article>
        </section>
      </div>
      <aside id="floating-toc" style="display: none;"></aside>
{footer}
    </div>
{scripts}
  </div>
</body>
</html>
"""


def build_tag_html(cfg: dict, tag: str, posts: list[dict]) -> str:
    head = render_head(cfg, f"标签：{tag} | {cfg['site_name']}")
    nav = render_nav(cfg, current_href="")
    footer = render_footer(cfg)
    scripts = render_scripts(cfg)

    items = []
    for p in posts:
        short_date = p["date"][2:]
        items.append(
            f"""              <article class="archive-article archive-type-post">
                <div class="archive-article-inner">
                  <header class="archive-article-header">
                    <h1 itemprop="name">
                      <a class="archive-article-title" href="/posts/{p['slug']}.html">{html.escape(p['title'])}</a>
                    </h1>
                    <div class="archive-article-line"></div>
                    <a href="/posts/{p['slug']}.html" class="archive-article-date">
                      <time class="dt-published" datetime="{p['date']}" itemprop="datePublished">{short_date}</time>
                    </a>
                  </header>
                </div>
              </article>"""
        )
    items_html = "\n\n".join(items)

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
{head}
<body lang="en">
  <div id="container">
    <div id="wrap">
{nav}
      <div id="header-title">
        <h1 id="logo-wrap">
          <a href="/index.html" id="logo">标签：{html.escape(tag)}</a>
        </h1>
      </div>
      <div id="content" class="outer not-home">
        <section id="main" class="has-toc">
          <section class="archives-wrap">
            <div class="archives">

{items_html}

            </div>
          </section>
        </section>
      </div>
      <aside id="floating-toc" style="display: none;"></aside>
{footer}
    </div>
{scripts}
  </div>
</body>
</html>
"""


def build_archives_html(cfg: dict, posts: list[dict]) -> str:
    head = render_head(cfg, f"归档 | {cfg['site_name']}")
    nav = render_nav(cfg, current_href="/archives.html")
    footer = render_footer(cfg)
    scripts = render_scripts(cfg)

    by_year: dict[str, list[dict]] = defaultdict(list)
    for p in posts:
        by_year[p["date"][:4]].append(p)

    sections = []
    for year in sorted(by_year.keys(), reverse=True):
        items = []
        for p in by_year[year]:
            short_date = p["date"][2:]
            items.append(
                f"""              <article id="archive-{p['slug']}" class="archive-article archive-type-post">
                <div class="archive-article-inner">
                  <header class="archive-article-header">
                    <h1 itemprop="name">
                      <a class="archive-article-title" href="/posts/{p['slug']}.html">{html.escape(p['title'])}</a>
                    </h1>
                    <div class="archive-article-line"></div>
                    <a href="/posts/{p['slug']}.html" class="archive-article-date">
                      <time class="dt-published" datetime="{p['date']}" itemprop="datePublished">{short_date}</time>
                    </a>
                  </header>
                </div>
              </article>"""
            )
        sections.append(
            f"""          <section class="archives-wrap">
            <div class="archive-year-wrap">
              <a class="archive-year">{year}</a>
            </div>
            <div class="archives">

{chr(10).join(items)}

            </div>
          </section>"""
        )

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
{head}
<body lang="en">
  <div id="container">
    <div id="wrap">
{nav}
      <div id="header-title">
        <h1 id="logo-wrap">
          <a href="/index.html" id="logo">Archives</a>
        </h1>
      </div>
      <div id="content" class="outer not-home">
        <section id="main" class="has-toc">
{chr(10).join(sections)}
        </section>
      </div>
      <aside id="floating-toc" style="display: none;"></aside>
{footer}
    </div>
{scripts}
  </div>
</body>
</html>
"""


def sync_shell_in_existing_html(html_path: Path, cfg: dict) -> None:
    """Updates shared nav, footer, asset versions, and site-data.js inclusion on existing HTML pages."""
    text = html_path.read_text(encoding="utf-8")
    v = cfg["asset_version"]
    site_name = html.escape(cfg["site_name"])

    # Determine current_href for nav active state
    rel = "/" + html_path.relative_to(ROOT).as_posix()
    current_href = rel if rel in {item["href"] for item in cfg["nav"]} else ""

    # Sync <nav id="main-nav">...</nav>
    text = re.sub(
        r'      <div id="nav-outer">\s*<nav id="main-nav".*?</nav>\s*</div>',
        render_nav(cfg, current_href),
        text,
        count=1,
        flags=re.S,
    )

    # Sync <footer id="footer">...</footer>
    text = re.sub(
        r'      <footer id="footer">.*?</footer>',
        render_footer(cfg),
        text,
        count=1,
        flags=re.S,
    )

    # Sync asset version ?v=...
    text = re.sub(r"(style\.css|script\.js|site-data\.js)\?v=[0-9.]+", rf"\1?v={v}", text)

    # Ensure site-data.js is loaded right before script.js
    if "site-data.js" not in text:
        text = text.replace(
            f'<script src="/js/script.js?v={v}"></script>',
            f'<script src="/js/site-data.js?v={v}"></script>\n    <script src="/js/script.js?v={v}"></script>',
        )

    # Sync #logo on homepage only (posts use #logo for the article title)
    if rel == "/index.html":
        text = re.sub(
            r'(<a href="/index\.html" id="logo">)([^<]+)(</a>)',
            rf"\g<1>{site_name}\g<3>",
            text,
            count=1,
        )

    html_path.write_text(text, encoding="utf-8")


def write_site_data_js(cfg: dict, posts: list[dict]) -> None:
    tag_counts: dict[str, int] = defaultdict(int)
    for p in posts:
        tag_counts[p["tag"]] += 1

    groups_out = []
    seen_tags: set[str] = set()
    for g in cfg.get("tag_groups", []):
        g_tags = []
        for t in g["tags"]:
            if tag_counts[t] > 0:
                g_tags.append({"name": t, "count": tag_counts[t], "href": f"/tags/{t}.html"})
                seen_tags.add(t)
        if g_tags:
            groups_out.append({"name": g["name"], "count": sum(x["count"] for x in g_tags), "tags": g_tags})

    # Any extra tags not in configured groups
    extra_tags = [
        {"name": t, "count": c, "href": f"/tags/{t}.html"}
        for t, c in sorted(tag_counts.items())
        if t not in seen_tags and c > 0
    ]
    if extra_tags:
        groups_out.append({"name": "其他", "count": sum(x["count"] for x in extra_tags), "tags": extra_tags})

    all_tags = []
    for g in groups_out:
        all_tags.extend(g["tags"])

    data = {
        "siteName": cfg["site_name"],
        "subtitle": cfg.get("subtitle", ""),
        "github": cfg["github"],
        "email": cfg["email"],
        "tagGroups": groups_out,
        "tags": all_tags,
        "posts": [
            {
                "slug": p["slug"],
                "title": p["title"],
                "date": p["date"],
                "tag": p["tag"],
                "url": f"/posts/{p['slug']}.html",
            }
            for p in posts
        ],
    }
    js_out = "window.SITE_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    (ROOT / "js" / "site-data.js").write_text(js_out, encoding="utf-8")


def write_sitemap_xml(cfg: dict, posts: list[dict], tags: list[str]) -> None:
    base = cfg["site_url"].rstrip("/")
    urls = [f"{base}/", f"{base}/archives.html", f"{base}/about.html", f"{base}/log.html", f"{base}/ask.html"]
    for p in posts:
        urls.append(f"{base}/posts/{p['slug']}.html")
    for t in tags:
        urls.append(f"{base}/tags/{t}.html")

    entries = "\n".join(f"  <url><loc>{html.escape(u)}</loc></url>" for u in urls)
    xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{entries}\n</urlset>\n'
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and synchronize HeptaZero static blog.")
    parser.add_argument("--rebuild-posts", action="store_true", help="Also overwrite existing posts/*.html from md/*.md")
    args = parser.parse_args()

    cfg = load_config()
    posts_dir = ROOT / "posts"
    md_dir = ROOT / "md"
    tags_dir = ROOT / "tags"

    # 1. Build new posts (or all md posts if --rebuild-posts)
    for md_file in sorted(md_dir.glob("*.md")):
        if md_file.name.startswith("0"):
            continue
        parsed = parse_md_template(md_file, cfg)
        if not parsed:
            continue
        target_html = posts_dir / f"{parsed['slug']}.html"
        if args.rebuild_posts or not target_html.exists():
            target_html.write_text(build_post_html(cfg, parsed), encoding="utf-8")
            print(f"[build] generated {target_html.relative_to(ROOT)}")

    # 2. Collect all published posts from posts/*.html (sorted newest first)
    all_posts: list[dict] = []
    for post_file in posts_dir.glob("*.html"):
        meta = extract_post_metadata_from_html(post_file)
        if meta:
            all_posts.append(meta)
    all_posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)

    # 3. Regenerate tags/*.html
    tags_map: dict[str, list[dict]] = defaultdict(list)
    for p in all_posts:
        tags_map[p["tag"]].append(p)

    for old_tag_file in tags_dir.glob("*.html"):
        if old_tag_file.stem not in tags_map:
            old_tag_file.unlink()
            print(f"[clean] removed unused tag page {old_tag_file.relative_to(ROOT)}")

    for tag, tag_posts in tags_map.items():
        tag_file = tags_dir / f"{tag}.html"
        tag_file.write_text(build_tag_html(cfg, tag, tag_posts), encoding="utf-8")
        print(f"[build] updated {tag_file.relative_to(ROOT)} ({len(tag_posts)})")

    # 4. Regenerate archives.html
    (ROOT / "archives.html").write_text(build_archives_html(cfg, all_posts), encoding="utf-8")
    print(f"[build] updated archives.html ({len(all_posts)} posts)")

    # 5. Sync shared shell & asset versions across all HTML files
    for html_file in list(ROOT.glob("*.html")) + list(posts_dir.glob("*.html")):
        sync_shell_in_existing_html(html_file, cfg)
    print(f"[sync] synchronized nav, footer, site_name, and ?v={cfg['asset_version']} across HTML pages")

    # 6. Write js/site-data.js & sitemap.xml
    write_site_data_js(cfg, all_posts)
    write_sitemap_xml(cfg, all_posts, sorted(tags_map.keys()))
    print("[build] updated js/site-data.js and sitemap.xml")


if __name__ == "__main__":
    main()
