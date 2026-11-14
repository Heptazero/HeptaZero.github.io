(function($){
  var currentArticleTocHtml = null;

  // -------------------------------------------------------------
  // 页面正文组件初始化（图片灯箱、大纲自动生成、滚动监听、代码复制、KaTeX）
  // -------------------------------------------------------------
  function initPage() {
    // 0. 确保页面及正文容器具备多语言自动连字符排版语言标识 (lang="en")
    if (!document.documentElement.getAttribute('lang')) {
      document.documentElement.setAttribute('lang', 'zh-CN');
    }
    if (document.body && !document.body.getAttribute('lang')) {
      document.body.setAttribute('lang', 'en');
    }
    $('.article-entry').attr('lang', 'en');

    // 1. Caption 自动提取与表格横向滚动封装
    $('.article-entry, .article-inner').each(function(i){
      $(this).find('img').each(function(){
        if ($(this).next('.caption').length || $(this).closest('.gallery-item').length) return;
        var alt = this.alt;
        if (alt) $(this).after('<span class="caption">' + alt + '</span>');
      });
    });

    // 表格移动端横向滑动包装（自适应包裹层）
    $('.article-entry table').each(function() {
      if (!$(this).parent().hasClass('table-wrap')) {
        $(this).wrap('<div class="table-wrap"></div>');
      }
    });

    // 首页文章摘要超长截断渐隐标记（短篇绝不附带多余白边）
    $('.article-entry.index-entry').each(function() {
      if (this.clientHeight >= 115 && this.scrollHeight > this.clientHeight + 4) {
        $(this).addClass('is-overflow');
      } else {
        $(this).removeClass('is-overflow');
      }
    });

    // 2. 代码块复制按钮
    var codes = document.getElementsByClassName('code');
    for (var i = 0; i < codes.length; ++i) {
      if ($(codes[i]).prev('.copy-button').length) continue; // 已存在则跳过
      var copy_button = document.createElement('div');
      copy_button.className = "copy-button";
      copy_button.innerHTML = "Copy";
      if (window.ClipboardJS) {
        new ClipboardJS(copy_button, {
          target: function(trigger) {
            return trigger.nextSibling;
          }
        });
      }
      copy_button.onclick = function(e) {
        var btn = e.target;
        btn.innerHTML = "Copied!";
        setTimeout(function() {
          btn.innerHTML = "Copy";
        }, 1000);
      };
      codes[i].parentElement.insertBefore(copy_button, codes[i]);
    }

    // 0. 站点标签 ID 动态映射（保证即使静态链接未刷新，标签显示名也与 site-data.js 同步）
    if (window.SITE_DATA && window.SITE_DATA.tagMap) {
      $('[data-tag-id]').each(function() {
        var tid = $(this).attr('data-tag-id');
        var info = window.SITE_DATA.tagMap[tid];
        if (info) {
          $(this).attr('href', info.href).text(info.name);
        }
      });
    }

    // 3. 自动生成真层级大纲并挂载到 #floating-toc
    var $floatingToc = $('#floating-toc');
    var isHome = $('#content').hasClass('is-home');
    var isAbout = $('.article-type-about').length > 0 || window.location.pathname.indexOf('about.html') !== -1;
    var isAsk = $('#ask-page').length > 0 || window.location.pathname.indexOf('ask.html') !== -1;
    var $entry = $('.article-entry');
    var articleTocHtml = null;

    if (!isHome && !isAbout && !isAsk && $floatingToc.length && $entry.length) {
      var $headings = $entry.find('h1, h2, h3, h4');
      if ($headings.length) {
        // 计算文章最高层级（有些从 h2 起步，有些如 blog-vision 从 h3 起步）
        var minLevel = 99;
        $headings.each(function() {
          var lvl = parseInt(this.tagName.substring(1), 10);
          if (lvl < minLevel) minLevel = lvl;
        });

        var tocHtml = '<ol class="toc">';
        var currentTopLi = false;
        var inChildOl = false;
        var secCounters = [];

        $headings.each(function(idx) {
          var $h = $(this);
          var id = $h.attr('id');
          if (!id) {
            id = 'heading-' + idx;
            $h.attr('id', id);
          }
          var text = $h.clone().find('.heading-sec-num').remove().end().text().replace(/^#+\s*/, '').trim();
          var tag = this.tagName.toLowerCase();
          var level = parseInt(tag.substring(1), 10);

          // 0 起始的多级标题悬浮编号（0, 0.1, 0.2, 1, 1.1...）
          var relLevel = Math.max(0, level - minLevel);
          if (relLevel === 0) {
            secCounters = [secCounters.length === 0 ? 0 : secCounters[0] + 1];
          } else {
            while (secCounters.length <= relLevel) {
              secCounters.push(0);
            }
            secCounters[relLevel] += 1;
            secCounters.length = relLevel + 1;
          }
          var secLabel = secCounters.join('.');
          if (!$h.find('.heading-sec-num').length) {
            $h.prepend('<span class="heading-sec-num" aria-hidden="true">' + secLabel + '</span>');
          }

          if (level <= minLevel) {
            if (inChildOl) {
              tocHtml += '</ol></li>';
              inChildOl = false;
              currentTopLi = false;
            } else if (currentTopLi) {
              tocHtml += '</li>';
              currentTopLi = false;
            }
            tocHtml += '<li class="toc-item toc-level-2" data-target="' + encodeURIComponent(id) + '">';
            tocHtml += '<a class="toc-link" href="#' + encodeURIComponent(id) + '"><span class="toc-dot"></span><span class="toc-text">' + text + '</span></a>';
            currentTopLi = true;
          } else {
            if (!inChildOl) {
              if (!currentTopLi) {
                tocHtml += '<li class="toc-item toc-level-2"><ol class="toc-child">';
              } else {
                tocHtml += '<ol class="toc-child">';
              }
              inChildOl = true;
            }
            tocHtml += '<li class="toc-item toc-level-' + level + '" data-target="' + encodeURIComponent(id) + '">';
            tocHtml += '<a class="toc-link" href="#' + encodeURIComponent(id) + '"><span class="toc-dot"></span><span class="toc-text">' + text + '</span></a></li>';
          }
        });
        if (inChildOl) {
          tocHtml += '</ol></li>';
        } else if (currentTopLi) {
          tocHtml += '</li>';
        }
        tocHtml += '</ol>';
        articleTocHtml = tocHtml;
        $floatingToc.html(tocHtml).show();
      } else {
        $floatingToc.empty().hide();
      }
    } else if ($floatingToc.length) {
      $floatingToc.empty().hide();
    }
    currentArticleTocHtml = articleTocHtml;

    // 3.5 自动计算正文字数（不含标点符号）与预计阅读时间，挂载到标题下方
    $('.article-reading-stats').remove();
    if (!isHome && !isAbout && !isAsk && $entry.length && !$('.archives-wrap').length && !$('#thoughts-list').length) {
      var $textClone = $entry.first().clone();
      $textClone.find('.sidenote, .hover-card, .copy-button, .article-footnotes, .heading-sec-num, script, style').remove();
      var rawText = $textClone.text() || '';
      var cjkMatches = rawText.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
      var enMatches = rawText.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g);
      var wordCount = (cjkMatches ? cjkMatches.length : 0) + (enMatches ? enMatches.length : 0);
      if (wordCount > 0) {
        var readMins = Math.max(1, Math.round(wordCount / 400));
        var $stats = $('<div class="article-reading-stats">约 ' + wordCount.toLocaleString('en-US') + ' 字 · 预计阅读 ' + readMins + ' 分钟</div>');
        var $logoWrap = $('#header-title #logo-wrap');
        if ($logoWrap.length) {
          $logoWrap.after($stats);
        } else {
          $('#header-title').append($stats);
        }
      }
    }

    // 4. KaTeX 数学公式自动渲染（带重试等待机制）
    function renderMathWithRetry() {
      if (window.renderMathInElement) {
        try {
          renderMathInElement(document.body, {
            delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\(', right: '\\)', display: false},
              {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
          });
        } catch(e) {}
      } else {
        var retryTimes = 0;
        var kInterval = setInterval(function() {
          retryTimes++;
          if (window.renderMathInElement) {
            clearInterval(kInterval);
            try {
              renderMathInElement(document.body, {
                delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$', right: '$', display: false},
                  {left: '\\(', right: '\\)', display: false},
                  {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
              });
            } catch(e) {}
          } else if (retryTimes > 35) {
            clearInterval(kInterval);
          }
        }, 100);
      }
    }
    renderMathWithRetry();

    // 5. 挂载与更新 Giscus 评论区（Ask 页不挂载全局评论，由具体问答卡片独立承载）
    function loadGiscus() {
      if ($('#ask-page').length || window.location.pathname.indexOf('ask.html') !== -1) return;
      var commentsEl = document.getElementById('comments');
      if (!commentsEl) return;

      var currentTheme = getPreferredTheme() === 'dark' ? 'transparent_dark' : 'light';

      var iframe = document.querySelector('iframe.giscus-frame');
      if (iframe) {
        iframe.contentWindow.postMessage({
          giscus: {
            setConfig: {
              term: window.location.pathname,
              theme: currentTheme
            }
          }
        }, 'https://giscus.app');
        return;
      }

      var container = document.getElementById('giscus-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'giscus-container';
        commentsEl.appendChild(container);
      }
      container.innerHTML = '';

      var script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.setAttribute('data-repo', 'Heptazero/HeptaZero.github.io');
      script.setAttribute('data-repo-id', 'R_kgDOQ_vXng');
      script.setAttribute('data-category', 'Announcements');
      script.setAttribute('data-category-id', 'DIC_kwDOQ_vXns4DKLjj');
      script.setAttribute('data-mapping', 'pathname');
      script.setAttribute('data-strict', '0');
      script.setAttribute('data-reactions-enabled', '1');
      script.setAttribute('data-emit-metadata', '0');
      script.setAttribute('data-input-position', 'top');
      script.setAttribute('data-theme', currentTheme);
      script.setAttribute('data-lang', 'zh-CN');
      script.setAttribute('crossorigin', 'anonymous');
      script.async = true;

      container.appendChild(script);
    }
    loadGiscus();

    // 6. 移动端/窄屏平行边注自动转为文章末尾双向跳转移植与极简矢量返回图标
    function initFootnotes() {
      var $sidenotes = $('.article-entry .sidenote');
      if (!$sidenotes.length) return;

      var $articleEntry = $('.article-entry').first();
      if (!$articleEntry.find('.article-footnotes').length) {
        var $footnotesWrap = $('<div class="article-footnotes"><div class="footnotes-title">注解</div><ol class="footnotes-list"></ol></div>');
        var $list = $footnotesWrap.find('.footnotes-list');

        var $refs = $articleEntry.find('.sidenote-ref');
        $sidenotes.each(function(index) {
          var noteNum = index + 1;
          var $note = $(this);
          $note.attr('data-fn-idx', noteNum);
          
          // 提取纯注解文本（去掉原本内部的 sup 编号）
          var noteHtml = $note.clone().find('.sidenote-num').remove().end().html().trim();

          // 给正文中的引用点加上返回锚点与链接（兼容旁批写在引用点前或后的两种写法）
          var $prevRef = $note.prev('.sidenote-ref');
          if (!$prevRef.length) {
            $prevRef = $refs.eq(index);
          }
          if ($prevRef.length) {
            $prevRef.attr('id', 'fnref-' + noteNum);
            $prevRef.html('<a href="#fn-' + noteNum + '" class="sidenote-anchor">' + noteNum + '</a>');
          }

          // 添加到末尾注解列表（使用极简返回 SVG 矢量图标替代粗糙 emoji ↩）
          var backIconSvg = '<svg class="footnote-back-icon" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>';
          var $item = $('<li id="fn-' + noteNum + '" class="footnote-item">' +
                        '<span class="footnote-content">' + noteHtml + '</span> ' +
                        '<a href="#fnref-' + noteNum + '" class="footnote-backref" title="跳回正文">' + backIconSvg + '</a>' +
                        '</li>');
          $list.append($item);
        });

        $articleEntry.append($footnotesWrap);
      }
    }
    initFootnotes();

    // 6.5 桌面端平行边注自动对齐（彻底消除 float 与 blockquote 嵌套导致的横向/纵向漂移）
    function layoutSidenotes() {
      var $articleEntry = $('.article-entry').first();
      if (!$articleEntry.length) return;
      var $notes = $articleEntry.find('.sidenote');
      if (!$notes.length) return;

      if (window.innerWidth <= 1100) {
        $notes.css({ position: '', top: '', left: '' });
        return;
      }

      $notes.each(function() {
        if (this.parentNode !== $articleEntry[0]) {
          $articleEntry[0].appendChild(this);
        }
      });

      var entryRect = $articleEntry[0].getBoundingClientRect();
      var targetLeft = Math.round(entryRect.width + 36);
      var lastBottom = -Infinity;

      $notes.each(function() {
        var $note = $(this);
        var idx = $note.attr('data-fn-idx');
        var refEl = idx ? document.getElementById('fnref-' + idx) : null;
        if (!refEl) return;

        var refRect = refEl.getBoundingClientRect();
        var idealTop = Math.round(refRect.top - entryRect.top - 2);
        var actualTop = Math.max(idealTop, lastBottom + 14);

        $note.css({
          position: 'absolute',
          left: targetLeft + 'px',
          top: actualTop + 'px'
        });

        var noteHeight = this.offsetHeight || 0;
        lastBottom = actualTop + noteHeight;
      });
    }
    layoutSidenotes();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(layoutSidenotes);
    }
    if (!window.__sidenoteLayoutBound) {
      window.__sidenoteLayoutBound = true;
      window.addEventListener('load', layoutSidenotes);
      window.addEventListener('resize', layoutSidenotes);
    }

    // 7. 边注与末尾脚注双向平滑跳转定位与闪烁高亮（严禁触发 PJAX 整页刷新或滚回顶部）
    if (!window.__footnoteJumpHandlerAttached) {
      window.__footnoteJumpHandlerAttached = true;
      document.addEventListener('click', function(e) {
        var anchor = e.target.closest ? e.target.closest('.sidenote-anchor, .footnote-backref') : null;
        if (!anchor) return;
        var href = anchor.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        e.preventDefault();
        var targetId = decodeURIComponent(href.substring(1));
        var targetEl = document.getElementById(targetId);
        if (targetEl) {
          var topPos = $(targetEl).offset().top - 80;
          $('html, body').stop().animate({ scrollTop: Math.max(0, topPos) }, 320);
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', href);
          }
          var $t = $(targetEl);
          $t.addClass('footnote-highlight');
          setTimeout(function() {
            $t.removeClass('footnote-highlight');
          }, 1200);
        }
      });
    }

    // 8. 悬浮预览卡片动态几何中心定位与屏幕边界约束（防超出视口，支持移动端轻触切换）
    function initHoverCards() {
      function closeAllCards() {
        document.querySelectorAll('.hover-card-anchor').forEach(function(a) {
          a.classList.remove('is-active');
          var c = a.querySelector('.hover-card');
          if (c) {
            c.style.opacity = '';
            c.style.pointerEvents = '';
          }
        });
      }

      function positionCard(anchorEl) {
        var cardEl = anchorEl.querySelector('.hover-card');
        if (!cardEl) return;
        var rect = anchorEl.getBoundingClientRect();
        var winW = window.innerWidth;
        var cardW = Math.min(270, winW - 32);

        // 取划线位置最左与最右的几何正中心
        var anchorCenter = (rect.left + rect.right) / 2;
        var cardLeft = anchorCenter - cardW / 2;

        // 边界约束：两端严格保留至少 16px 安全距离，严禁超出手机屏幕
        cardLeft = Math.max(16, Math.min(cardLeft, winW - cardW - 16));

        cardEl.style.position = 'fixed';
        cardEl.style.boxSizing = 'border-box';
        cardEl.style.width = cardW + 'px';
        cardEl.style.left = cardLeft + 'px';
        cardEl.style.transform = 'none';

        // 垂直上下智能翻转
        var cardH = cardEl.offsetHeight || 120;
        if (rect.top - cardH - 12 > 10) {
          cardEl.style.top = 'auto';
          cardEl.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
        } else {
          cardEl.style.bottom = 'auto';
          cardEl.style.top = (rect.bottom + 8) + 'px';
        }
      }

      document.querySelectorAll('.hover-card-anchor').forEach(function(anchor) {
        // 预先计算初始几何中心与边界约束
        positionCard(anchor);

        anchor.addEventListener('mouseenter', function() {
          positionCard(anchor);
        });
        anchor.addEventListener('mouseover', function() {
          positionCard(anchor);
        });
        anchor.addEventListener('touchstart', function() {
          positionCard(anchor);
        }, { passive: true });
        anchor.addEventListener('click', function(e) {
          e.stopPropagation();
          var wasActive = anchor.classList.contains('is-active');
          closeAllCards();
          if (!wasActive) {
            positionCard(anchor);
            anchor.classList.add('is-active');
            var card = anchor.querySelector('.hover-card');
            if (card) {
              card.style.opacity = '1';
              card.style.pointerEvents = 'auto';
            }
          }
        });
      });

      if (!window.__hoverCardDocClickAttached) {
        window.__hoverCardDocClickAttached = true;
        // 移动端滚动/触控滑动时立即收起悬浮卡片，彻底消除“不随翻动划走”与“悬浮在很上方”的问题
        window.addEventListener('scroll', closeAllCards, { passive: true });
        window.addEventListener('touchmove', closeAllCards, { passive: true });

        // iOS Safari 兼容：点击/触控正文任意空白处立即收起卡片
        var handleDismiss = function(e) {
          if (!e.target.closest || !e.target.closest('.hover-card-anchor')) {
            closeAllCards();
          }
        };
        document.addEventListener('click', handleDismiss);
        document.addEventListener('touchstart', handleDismiss, { passive: true });
        document.addEventListener('pointerdown', handleDismiss, { passive: true });

        window.addEventListener('resize', function() {
          document.querySelectorAll('.hover-card-anchor.is-active').forEach(positionCard);
        });
      }
    }
    initHoverCards();

    // 立即执行一次大纲高亮计算，确保打开页面即处于激活状态
    setTimeout(updateScrollSpy, 50);

    // 渲染全站全局复用的侧边抽屉与顶栏活动状态
    renderGlobalMobileNav();
    renderGlobalSubNav();
    updateNavActiveState();
  }

  // -------------------------------------------------------------
  // 深色模式 (Dark Mode) 管理系统
  // -------------------------------------------------------------
  var THEME_KEY = 'heptazero_theme';

  function getPreferredTheme() {
    if (document.documentElement.classList.contains('dark-mode') || (document.body && document.body.classList.contains('dark-mode'))) {
      return 'dark';
    }
    var stored = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    var isDark = (theme === 'dark');
    document.documentElement.classList.toggle('dark-mode', isDark);
    if (document.body) {
      document.body.classList.toggle('dark-mode', isDark);
    }
    if (persist) {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem('theme', theme);
    }
    syncGiscusTheme(theme);
  }

  function toggleTheme() {
    var current = document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light';
    var next = (current === 'dark') ? 'light' : 'dark';
    applyTheme(next, true);
  }

  function syncGiscusTheme(theme) {
    var iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({
      giscus: {
        setConfig: {
          theme: (theme === 'dark') ? 'transparent_dark' : 'light'
        }
      }
    }, 'https://giscus.app');
  }

  // 监听 Giscus 异步加载握手消息，确保首次加载即同步为 transparent_dark，根除白底方块
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://giscus.app') return;
    if (event.data && typeof event.data === 'object' && event.data.giscus) {
      var currentTheme = document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light';
      syncGiscusTheme(currentTheme);
    }
  });

  // 监听操作系统深浅色设置变更
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }

  // 立即在脚本解析时初次生效
  applyTheme(getPreferredTheme(), false);

  // -------------------------------------------------------------
  // 站点通用提示 (Toast)
  // -------------------------------------------------------------
  function showToast(message) {
    var existing = document.getElementById('site-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 2200);
  }

  // -------------------------------------------------------------
  // 顶栏右侧辅助操作区组件（单点维护，支持深色切换、双语与联系展开）
  // -------------------------------------------------------------
  function renderGlobalSubNav() {
    var $subNav = $('#sub-nav');
    if (!$subNav.length) return;

    var globeSvg = '<svg class="lang-icon-globe" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
    var sunMoonSvg = '<svg class="theme-icon-sun" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><svg class="theme-icon-moon" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

    var html = '<div class="sub-nav-social">' +
      '  <a id="nav-github-link" class="nav-icon" href="https://github.com/HeptaZero" target="_blank" rel="noopener" title="GitHub"></a>' +
      '  <a id="nav-mail-link" class="nav-icon" href="mailto:1004752777@qq.com" title="Email"></a>' +
      '</div>' +
      '<button class="nav-btn lang-toggle-btn" title="切换语言 / Switch Language" type="button" aria-label="Toggle language">' + globeSvg + '</button>' +
      '<button class="nav-btn theme-toggle-btn" title="切换深色/浅色模式 / Toggle Dark Mode" type="button" aria-label="Toggle theme">' + sunMoonSvg + '</button>';

    $subNav.html(html);
  }

  // -------------------------------------------------------------
  // 全局移动端侧边抽屉组件（单点维护，全站 0 构建复用）
  // -------------------------------------------------------------
  function renderGlobalMobileNav(articleTocHtml) {
    var $mobileNav = $('#mobile-nav');
    if (!$mobileNav.length) return;

    if (articleTocHtml === undefined) {
      articleTocHtml = currentArticleTocHtml;
    }

    var globeSvg = '<svg class="lang-icon-globe" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
    var sunMoonSvg = '<svg class="theme-icon-sun" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><svg class="theme-icon-moon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

    var siteData = window.SITE_DATA || {
      github: 'https://github.com/HeptaZero',
      email: '1004752777@qq.com',
      tagGroups: [{
        name: '个人',
        count: 3,
        tags: [
          { name: '虚拟作品评价', count: 1, href: '/tags/虚拟作品评价.html' },
          { name: '杂谈', count: 2, href: '/tags/杂谈.html' }
        ]
      }],
      tags: [
        { name: '虚拟作品评价', count: 1, href: '/tags/虚拟作品评价.html' },
        { name: '杂谈', count: 2, href: '/tags/杂谈.html' }
      ]
    };

    // 移动端固定底部操作栏（PC 端 CSS 已设置为 display: none !important，绝不与顶栏重复）
    var toolbarHtml = '<div class="mobile-nav-toolbar">' +
      '<div class="mobile-nav-toolbar-left">' +
      '  <a id="mobile-nav-github-link" class="nav-icon" href="' + siteData.github + '" target="_blank" rel="noopener" title="GitHub"></a>' +
      '  <a id="mobile-nav-mail-link" class="nav-icon" href="mailto:' + siteData.email + '" title="Email"></a>' +
      '</div>' +
      '<div class="mobile-nav-toolbar-right">' +
      '  <button class="mobile-toolbar-btn lang-toggle-btn" title="切换语言 / Switch Language" type="button" aria-label="Toggle language">' + globeSvg + '</button>' +
      '  <button class="mobile-toolbar-btn theme-toggle-btn" title="切换深色/浅色模式 / Toggle Dark Mode" type="button" aria-label="Toggle theme">' + sunMoonSvg + '</button>' +
      '</div>' +
      '</div>';

    if (articleTocHtml) {
      // 具体文章页：仅展示大纲与底部操作栏，彻底隐藏标签树与标签词云（不显示冗余的“目录”两字）
      var tocBodyHtml = '<div class="mobile-nav-scroll-body">' +
        '<div class="mobile-nav-toc">' +
        '  <div class="mobile-toc-container">' + articleTocHtml + '</div>' +
        '</div>' +
        '</div>';
      $mobileNav.html(tocBodyHtml + toolbarHtml);
    } else {
      // 非文章页：根据 site-data.js 动态渲染标签树、标签词云与底部操作栏
      var treeGroupsHtml = '';
      $.each(siteData.tagGroups || [], function(_, group) {
        var leavesHtml = '';
        $.each(group.tags || [], function(_, t) {
          leavesHtml += '<li class="category-list-item">' +
            '<a class="category-leaf-link" href="' + t.href + '">' +
            '  <span class="tag-tree-dot"></span>' +
            '  <span class="category-list-name">' + t.name + '</span>' +
            '  <span class="category-list-count">' + t.count + '</span>' +
            '</a>' +
            '</li>';
        });
        treeGroupsHtml += '<li class="category-list-item tag-tree-open">' +
          '<div class="category-item-row tag-tree-toggle" role="button">' +
          '  <span class="tag-tree-arrow">▾</span>' +
          '  <span class="category-list-name">' + group.name + '</span>' +
          '  <span class="category-list-count">' + group.count + '</span>' +
          '</div>' +
          '<ul class="category-list-child">' + leavesHtml + '</ul>' +
          '</li>';
      });

      var scrollBodyHtml = '<div class="mobile-nav-categories">' +
        '  <h3 class="widget-title">标签树</h3>' +
        '  <div class="tag-tree-container">' +
        '    <ul class="category-list tag-tree">' + treeGroupsHtml + '</ul>' +
        '  </div>' +
        '</div>';

      var cloudLinksHtml = '';
      $.each(siteData.tags || [], function(_, t) {
        cloudLinksHtml += '<a href="' + t.href + '">' + t.name + '</a>';
      });

      var tagCloudHtml = '<div class="mobile-nav-tagcloud">' +
        '  <h3 class="widget-title">标签词云</h3>' +
        '  <div class="mobile-nav-tagcloud-inner">' + cloudLinksHtml + '</div>' +
        '</div>';

      $mobileNav.html('<div class="mobile-nav-scroll-body">' + scrollBodyHtml + '</div>' + tagCloudHtml + toolbarHtml);
    }
  }

  // -------------------------------------------------------------
  // 顶栏主导航高亮同步
  // -------------------------------------------------------------
  function updateNavActiveState() {
    var path = window.location.pathname;
    var filename = path.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
    $('.main-nav-link').each(function() {
      var href = $(this).attr('href') || '';
      var targetName = href.split('/').pop().split('?')[0].split('#')[0];
      if (targetName === filename || ((filename === 'index.html' || filename === '') && (targetName === 'index.html' || targetName === ''))) {
        $(this).addClass('current');
      } else {
        $(this).removeClass('current');
      }
    });
  }

  // 手机端侧边栏基础交互
  var $container = $('#container'),
    isMobileNavAnim = false,
    mobileNavAnimDuration = 200;

  var startMobileNavAnim = function(){
    isMobileNavAnim = true;
  };

  var stopMobileNavAnim = function(){
    setTimeout(function(){
      isMobileNavAnim = false;
    }, mobileNavAnimDuration);
  };

  // 移动端侧边抽屉与遮罩全局事件委托（原生事件监听，PJAX 切页后永不失效，且不依赖特定 jQuery 版本）
  var dimEl = document.getElementById('mobile-nav-dim');
  if (!dimEl) {
    dimEl = document.createElement('div');
    dimEl.id = 'mobile-nav-dim';
    document.body.appendChild(dimEl);
  }

  document.addEventListener('click', function(e) {
    var target = e.target;

    // 切换深色/浅色模式（PC 顶栏与移动端抽屉底部通用）
    var themeBtn = target.closest ? target.closest('.theme-toggle-btn') : null;
    if (themeBtn) {
      e.preventDefault();
      toggleTheme();
      return;
    }

    // 切换语言按钮（PC 顶栏与移动端抽屉底部通用）
    var langBtn = target.closest ? target.closest('.lang-toggle-btn') : null;
    if (langBtn) {
      e.preventDefault();
      showToast('英文版本正在整理中 / English version in progress...');
      return;
    }

    var toggleBtn = target.closest ? target.closest('#main-nav-toggle') : null;
    if (toggleBtn) {
      e.preventDefault();
      if (isMobileNavAnim) return;
      startMobileNavAnim();
      $container.toggleClass('mobile-nav-on');
      stopMobileNavAnim();
      return;
    }

    var dimTarget = target.closest ? target.closest('#mobile-nav-dim') : null;
    if (dimTarget) {
      if (isMobileNavAnim) return;
      startMobileNavAnim();
      $container.removeClass('mobile-nav-on');
      stopMobileNavAnim();
      return;
    }

    var tocLink = target.closest ? target.closest('.mobile-nav-toc .toc-link') : null;
    if (tocLink) {
      var href = tocLink.getAttribute('href');
      $container.removeClass('mobile-nav-on');
      if (href && href.charAt(0) === '#') {
        e.preventDefault();
        var rawId = href.substring(1);
        try {
          var targetId = decodeURIComponent(rawId);
          var targetEl = document.getElementById(targetId);
          if (targetEl) {
            setTimeout(function() {
              var topPos = $(targetEl).offset().top - 70;
              $('html, body').stop().animate({ scrollTop: Math.max(0, topPos) }, 320);
              if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', href);
              }
              var $t = $(targetEl);
              $t.addClass('footnote-highlight');
              setTimeout(function() {
                $t.removeClass('footnote-highlight');
              }, 1200);
            }, 80);
          }
        } catch(err) {}
      }
      return;
    }

    var tagToggle = target.closest ? target.closest('.tag-tree-toggle') : null;
    if (tagToggle) {
      var item = tagToggle.closest('.category-list-item');
      if (item) item.classList.toggle('tag-tree-open');
      return;
    }

    var mobileNavLink = target.closest ? target.closest('#mobile-nav a') : null;
    if (mobileNavLink) {
      $container.removeClass('mobile-nav-on');
    }

    if ($container.hasClass('mobile-nav-on')) {
      var inMobileNav = target.closest ? target.closest('#mobile-nav') : null;
      if (!inMobileNav) {
        $container.removeClass('mobile-nav-on');
      }
    }
  });

  // PC 端鼠标悬停左上角菜单与浮窗卡片交互 (纯原生事件监听，0 依赖，丝滑展开与延时防抖关闭)
  var navHoverTimer = null;
  function isDesktopScreen() {
    return window.innerWidth >= 811;
  }

  document.addEventListener('mouseover', function(e) {
    if (!isDesktopScreen()) return;
    var target = e.target;
    var toggleBtn = target && target.closest ? target.closest('#main-nav-toggle') : null;
    var mobileNav = target && target.closest ? target.closest('#mobile-nav') : null;
    if (toggleBtn || mobileNav) {
      if (navHoverTimer) {
        clearTimeout(navHoverTimer);
        navHoverTimer = null;
      }
      if (!$container.hasClass('mobile-nav-on')) {
        $container.addClass('mobile-nav-on');
      }
    }
  });

  document.addEventListener('mouseout', function(e) {
    if (!isDesktopScreen()) return;
    var related = e.relatedTarget;
    var inToggle = related && related.closest ? related.closest('#main-nav-toggle') : null;
    var inNav = related && related.closest ? related.closest('#mobile-nav') : null;
    if (!inToggle && !inNav) {
      if (navHoverTimer) clearTimeout(navHoverTimer);
      navHoverTimer = setTimeout(function() {
        $container.removeClass('mobile-nav-on');
      }, 180);
    }
  });

  // 纯原生高性能无依赖全屏灯箱（彻底杜绝移动端将图片链接误当成文件下载的弹窗行为）
  document.addEventListener('click', function(e) {
    var target = e.target;
    var img = target.closest ? target.closest('.article-entry img, .gallery-item img') : null;
    if (!img) return;

    // 若图片在有真实跳转意图的超链接内且非灯箱链接，则放行
    if (img.parentElement && img.parentElement.tagName === 'A' && !img.parentElement.classList.contains('fancybox') && !img.parentElement.classList.contains('image-lightbox-link')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    var src = img.getAttribute('src');
    var caption = img.getAttribute('alt') || '';
    if (!src) return;

    var lightbox = document.getElementById('image-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'image-lightbox';
      lightbox.innerHTML = '<div class="lightbox-dialog"><img class="lightbox-img-full" src="" alt="" /><div class="lightbox-caption"></div><button class="lightbox-close" title="关闭">&times;</button></div>';
      document.body.appendChild(lightbox);

      lightbox.addEventListener('click', function(evt) {
        if (!evt.target.classList.contains('lightbox-img-full')) {
          lightbox.classList.remove('active');
        }
      });
      document.addEventListener('keydown', function(evt) {
        if (evt.key === 'Escape' || evt.keyCode === 27) {
          lightbox.classList.remove('active');
        }
      });
    }

    var fullImg = lightbox.querySelector('.lightbox-img-full');
    if (fullImg) fullImg.src = src;
    var capEl = lightbox.querySelector('.lightbox-caption');
    if (capEl) {
      if (caption) {
        capEl.textContent = caption;
        capEl.style.display = 'block';
      } else {
        capEl.style.display = 'none';
      }
    }
    lightbox.classList.add('active');
  });

  // TOC scroll spy（结合人体自然阅读视线基准线与触底锁定，全端大纲与抽屉双向同步）
  function updateScrollSpy(){
    var scrollTop = $(window).scrollTop();
    var $desktopLinks = $('#floating-toc .toc-link');
    var $links = $desktopLinks.length ? $desktopLinks : $('.toc-link');
    if (!$links.length) return;
    var headers = [];

    $links.each(function(){
      var href = $(this).attr('href');
      if (href && href.charAt(0) === '#') {
        var rawId = href.substring(1);
        try {
          var decoded = decodeURIComponent(rawId);
          var el = document.getElementById(decoded);
          if (el) {
            headers.push({
              href: href,
              top: $(el).offset().top
            });
          }
        } catch(e) {}
      }
    });

    if (!headers.length) return;

    var activeHref = null;
    var winHeight = $(window).height();
    var docHeight = $(document).height();
    var isBottom = (scrollTop + winHeight >= docHeight - 80);

    // 触底边缘检测：翻滚到文章末尾时直接锁定激活最后一节（解决短小尾章无法到达视线线问题）
    if (isBottom) {
      activeHref = headers[headers.length - 1].href;
    } else {
      // 自然阅读视线基准线（屏幕高度的 38%，居中偏上，最符合人类浏览网页时的注视落点）
      var triggerLine = scrollTop + winHeight * 0.38;
      for (var i = 0; i < headers.length; i++) {
        if (triggerLine >= headers[i].top) {
          activeHref = headers[i].href;
        } else {
          break;
        }
      }
    }

    // 初始加载页面且未滑到任何标题时，默认激活首个章节展开
    if (!activeHref && headers.length) {
      activeHref = headers[0].href;
    }

    $('.toc-link').removeClass('active');
    $('.toc-item').removeClass('active-current active-parent');

    if (activeHref) {
      var $matchingLinks = $('.toc-link[href="' + activeHref + '"]');
      $matchingLinks.addClass('active');
      $matchingLinks.each(function() {
        var $activeItem = $(this).closest('.toc-item');
        $activeItem.addClass('active-current');

        // 向上溯源：激活所在的大节（展开文字与子集）
        var $parentH2 = $(this).closest('.toc-level-2');
        if ($parentH2.length) {
          $parentH2.addClass('active-parent');
        }
      });
    }
  }

  $(window).scroll(updateScrollSpy);

  // 首页文章卡片摘要点击代理：点击卡片空白或文本直接进入文章
  $(document).delegate('.index-mode .index-entry', 'click', function(e) {
    if ($(e.target).closest('a').length) return;
    var postLink = $(this).closest('.article-inner').find('.article-title').attr('href');
    if (postLink) {
      if (typeof window.pjaxNavigate === 'function') {
        window.pjaxNavigate(postLink);
      } else {
        window.location.href = postLink;
      }
    }
  });

  // -------------------------------------------------------------
  // PJAX: 平滑无感切页引擎（消除全页刷新白屏，顶栏与字体原地不动）
  // -------------------------------------------------------------
  if (window.fetch && window.DOMParser && window.history && window.history.pushState) {
    var pjaxParser = new DOMParser();

    function pjaxLoad(url, isPush) {
      fetch(url)
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function(html) {
          var newDoc = pjaxParser.parseFromString(html, 'text/html');
          if (!newDoc) {
            window.location.href = url;
            return;
          }

          // 1. 更新网页标题
          document.title = newDoc.title;

          // 2. 原地替换标题区
          var newHeaderTitle = newDoc.getElementById('header-title');
          var oldHeaderTitle = document.getElementById('header-title');
          if (newHeaderTitle && oldHeaderTitle) {
            oldHeaderTitle.innerHTML = newHeaderTitle.innerHTML;
            oldHeaderTitle.className = newHeaderTitle.className;
          }

          // 2.5 原地替换顶栏（保持最新导航与高亮状态）
          var newNavOuter = newDoc.getElementById('nav-outer');
          var oldNavOuter = document.getElementById('nav-outer');
          if (newNavOuter && oldNavOuter) {
            oldNavOuter.innerHTML = newNavOuter.innerHTML;
          }

          // 3. 原地替换正文内容区
          var newContent = newDoc.getElementById('content');
          var oldContent = document.getElementById('content');
          if (newContent && oldContent) {
            oldContent.innerHTML = newContent.innerHTML;
            oldContent.className = newContent.className;
          }
          $container.removeClass('mobile-nav-on');

          // 4. 原地同步大纲容器（仅当新页面为文章页且含有标题时才显示；About、Ask 与 Home 均不大纲化）
          var isAboutPage = url.indexOf('about.html') !== -1 || !!newDoc.querySelector('.article-type-about');
          var isAskPage = url.indexOf('ask.html') !== -1 || !!newDoc.querySelector('#ask-page');
          var hasHeadings = !isAboutPage && !isAskPage && !!newDoc.querySelector('.not-home .article-entry h1, .not-home .article-entry h2, .not-home .article-entry h3');
          var oldFloatingToc = document.getElementById('floating-toc');
          if (!oldFloatingToc) {
            oldFloatingToc = document.createElement('aside');
            oldFloatingToc.id = 'floating-toc';
            var wrapEl = document.getElementById('wrap');
            var footerEl = document.getElementById('footer');
            if (wrapEl && footerEl) {
              wrapEl.insertBefore(oldFloatingToc, footerEl);
            }
          }
          if (hasHeadings) {
            oldFloatingToc.innerHTML = '';
            oldFloatingToc.style.display = '';
          } else {
            oldFloatingToc.innerHTML = '';
            oldFloatingToc.style.display = 'none';
          }

          // 5. 更新导航链接的 current 高亮状态
          var currentFileName = url.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
          $('.main-nav-link').each(function() {
            var href = $(this).attr('href') || '';
            var targetName = href.split('/').pop().split('?')[0].split('#')[0];
            if (targetName === currentFileName || (currentFileName === '' && targetName === 'index.html')) {
              $(this).addClass('current');
            } else {
              $(this).removeClass('current');
            }
          });

          // 6. 更新历史记录并滚到顶部（若有锚点 hash 则滚到锚点）
          if (isPush !== false) {
            window.history.pushState({ pjax: true, url: url }, document.title, url);
          }
          lastPjaxPath = window.location.pathname + window.location.search;
          if (url.indexOf('#') !== -1) {
            var hash = url.split('#')[1];
            var targetEl = document.getElementById(decodeURIComponent(hash));
            if (targetEl) {
              window.scrollTo(0, $(targetEl).offset().top - 80);
            } else {
              window.scrollTo(0, 0);
            }
          } else {
            window.scrollTo(0, 0);
          }

          // 7. 重新初始化正文组件
          initPage();
        })
        .catch(function(err) {
          window.location.href = url;
        });
    }

    window.pjaxNavigate = pjaxLoad;

    // 拦截站内链接（彻底排除图片、灯箱链接和外部锚点）
    document.addEventListener('click', function(e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;

      var href = a.getAttribute('href');
      var target = a.getAttribute('target');

      if (!href || href.indexOf('#') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('javascript:') === 0 || target === '_blank') {
        return;
      }
      // 避免拦截图片灯箱及图片数据，防止大纲消失
      if (a.classList.contains('fancybox') || a.hasAttribute('data-fancybox') || href.indexOf('data:image') === 0 || href.match(/\.(jpeg|jpg|gif|png|svg|webp|bmp)($|\?)/i)) {
        return;
      }
      if (a.hostname && a.hostname !== window.location.hostname) {
        return;
      }

      e.preventDefault();
      pjaxLoad(a.href, true);
    });

    // 监听后退/前进（仅当页面真实 URL 路径改变时执行 PJAX，同页面内部 hash/脚注锚点跳转严禁重复拉取或刷新）
    var lastPjaxPath = window.location.pathname + window.location.search;
    window.addEventListener('popstate', function() {
      var currentPath = window.location.pathname + window.location.search;
      if (currentPath !== lastPjaxPath) {
        lastPjaxPath = currentPath;
        pjaxLoad(window.location.href, false);
      }
    });
  }

  // 初次进入页面运行
  initPage();

  // 若页面引入了 KaTeX auto-render，等待加载后初次渲染
  if (window.addEventListener) {
    window.addEventListener('load', function() {
      if (window.renderMathInElement) {
        try {
          renderMathInElement(document.body, {
            delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\(', right: '\\)', display: false},
              {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
          });
        } catch(e) {}
      }
    });
  }

})(jQuery);
