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
        if ($(this).next('.caption').length || $(this).closest('.gallery-item, .prose-figure').length || $(this).siblings('figcaption').length) return;
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

    // 6.5 桌面端平行边注自动对齐 + 左侧大纲防碰撞自适应宽度
    function layoutSidenotes() {
      var mainEl = document.getElementById('main');
      var tocEl = document.getElementById('floating-toc');
      if (mainEl && tocEl && tocEl.innerHTML.trim()) {
        var mainRect = mainEl.getBoundingClientRect();
        var leftGutter = Math.floor(mainRect.left - 34);
        if (window.innerWidth <= 1100 || leftGutter < 120) {
          tocEl.style.maxWidth = '';
          tocEl.classList.add('toc-auto-hidden');
          tocEl.style.opacity = '0';
          tocEl.style.pointerEvents = 'none';
        } else {
          tocEl.classList.remove('toc-auto-hidden');
          tocEl.style.maxWidth = leftGutter + 'px';
          tocEl.style.opacity = '';
          tocEl.style.pointerEvents = '';
        }
      }

      var $articleEntry = $('.article-entry').first();
      if (!$articleEntry.length) return;
      var $notes = $articleEntry.find('.sidenote');
      if (!$notes.length) return;

      var entryRect = $articleEntry[0].getBoundingClientRect();
      var rightGutter = Math.floor(window.innerWidth - entryRect.right - 44);
      if (window.innerWidth <= 1100 || rightGutter < 180) {
        $notes.css({ position: '', top: '', left: '', display: window.innerWidth > 1100 ? 'none' : '' });
        return;
      }
      $notes.css({ display: '' });

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
    window.__layoutSidenotes = layoutSidenotes;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        if (window.__layoutSidenotes) window.__layoutSidenotes();
      });
    }
    if (!window.__sidenoteLayoutBound) {
      window.__sidenoteLayoutBound = true;
      window.addEventListener('load', function() {
        if (window.__layoutSidenotes) window.__layoutSidenotes();
      });
      window.addEventListener('resize', function() {
        if (window.__layoutSidenotes) window.__layoutSidenotes();
      });
    }

    // 6.6 杂志风浮动配图加载完成后同步刷新右侧旁批坐标
    function layoutProseFigures() {
      var $figs = $('.article-entry .prose-figure.float-right, .article-entry .prose-figure.float-left');
      if (!$figs.length) return;
      $figs.css({ width: '', maxWidth: '' });
      $figs.each(function() {
        var img = this.querySelector('img');
        if (img && !img.complete) {
          img.addEventListener('load', function() {
            if (window.__layoutSidenotes) window.__layoutSidenotes();
          }, { once: true });
        }
      });
      if (window.__layoutSidenotes) window.__layoutSidenotes();
    }
    layoutProseFigures();
    window.__layoutProseFigures = layoutProseFigures;
    if (!window.__proseFigureLayoutBound) {
      window.__proseFigureLayoutBound = true;
      window.addEventListener('load', function() {
        if (window.__layoutProseFigures) window.__layoutProseFigures();
      });
      window.addEventListener('resize', function() {
        if (window.__layoutProseFigures) window.__layoutProseFigures();
      });
    }

    // 6.7 文章页左上角极简阅读控制条（A- / A+ · 版心宽度切换 · 专注阅读模式）
    $('.reader-toolbar').remove();
    var isPostPage = !isHome && !isAbout && !isAsk && $entry.length && !$('.archives-wrap').length && !$('#thoughts-list').length && !$('.dynamic-stream').length;
    if (isPostPage) {
      document.documentElement.classList.add('is-post-page');
    } else {
      document.documentElement.classList.remove('is-post-page');
    }
    if (isPostPage) {
      var prefs = { size: 16, width: 'normal', focus: false };
      try {
        var saved = JSON.parse(localStorage.getItem('heptazero_reader_prefs') || '{}');
        if (saved.size >= 14 && saved.size <= 22) prefs.size = saved.size;
        if (saved.width === 'narrow' || saved.width === 'normal' || saved.width === 'wide') prefs.width = saved.width;
      } catch (e) {}

      function applyReaderPrefs(animateSidenotes) {
        document.documentElement.style.setProperty('--reader-font-size', prefs.size + 'px');
        $('html').removeClass('reader-width-narrow reader-width-wide');
        if (prefs.width === 'narrow') $('html').addClass('reader-width-narrow');
        if (prefs.width === 'wide') $('html').addClass('reader-width-wide');
        if (prefs.focus) {
          $('html').addClass('reader-focus-mode');
        } else {
          $('html').removeClass('reader-focus-mode');
        }
        try {
          localStorage.setItem('heptazero_reader_prefs', JSON.stringify({ size: prefs.size, width: prefs.width }));
        } catch (e) {}
        layoutSidenotes();
        if (window.__updateStickySectionHeader) window.__updateStickySectionHeader();
        if (animateSidenotes) {
          var animStart = Date.now();
          function syncWidthTransitionFrame() {
            layoutSidenotes();
            if (window.__updateStickySectionHeader) window.__updateStickySectionHeader();
            if (Date.now() - animStart < 400) {
              requestAnimationFrame(syncWidthTransitionFrame);
            }
          }
          requestAnimationFrame(syncWidthTransitionFrame);
        }
      }
      applyReaderPrefs(false);

      var widthIcons = {
        normal: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="5" x2="4" y2="19"></line><line x1="20" y1="5" x2="20" y2="19"></line><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>',
        wide: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 8 3 12 7 16"></polyline><polyline points="17 8 21 12 17 16"></polyline><line x1="3" y1="12" x2="21" y2="12"></line></svg>',
        narrow: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 8 8 12 4 16"></polyline><polyline points="20 8 16 12 20 16"></polyline><line x1="12" y1="5" x2="12" y2="19"></line></svg>'
      };
      var focusIcon = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
      var widthLabels = { narrow: '窄', normal: '标准', wide: '宽' };
      var widthOrder = ['normal', 'wide', 'narrow'];

      var $toolbar = $(
        '<div class="reader-toolbar" aria-label="阅读设置">' +
          '<button type="button" class="reader-tool-btn" data-reader-focus="toggle" title="专注阅读 (Esc 退出)">' + focusIcon + '</button>' +
          '<span class="reader-tool-divider"></span>' +
          '<button type="button" class="reader-tool-btn" data-reader-size="1" title="放大字号">A+</button>' +
          '<button type="button" class="reader-tool-btn" data-reader-size="-1" title="缩小字号">A-</button>' +
          '<span class="reader-tool-divider reader-width-divider"></span>' +
          '<button type="button" class="reader-tool-btn reader-width-btn" data-reader-width="cycle" title="切换版心宽度">' + widthIcons[prefs.width] + '</button>' +
        '</div>'
      );

      function syncToolbarUI() {
        $toolbar.find('[data-reader-width]')
          .html(widthIcons[prefs.width])
          .attr('title', '版心宽度：' + widthLabels[prefs.width] + '（点击切换）');
        var focusBtn = $toolbar.find('[data-reader-focus]')[0];
        if (focusBtn) {
          if (prefs.focus) focusBtn.classList.add('is-active');
          else focusBtn.classList.remove('is-active');
        }
      }
      syncToolbarUI();

      $toolbar.find('[data-reader-size]').bind('click', function(e) {
        e.stopPropagation();
        var delta = parseInt($(this).attr('data-reader-size'), 10);
        prefs.size = Math.min(22, Math.max(14, prefs.size + delta));
        applyReaderPrefs(true);
        syncToolbarUI();
      });
      $toolbar.find('[data-reader-width]').bind('click', function(e) {
        e.stopPropagation();
        var nextIdx = (widthOrder.indexOf(prefs.width) + 1) % widthOrder.length;
        prefs.width = widthOrder[nextIdx];
        applyReaderPrefs(true);
        syncToolbarUI();
      });
      $toolbar.find('[data-reader-focus]').bind('click', function(e) {
        e.stopPropagation();
        prefs.focus = !document.documentElement.classList.contains('reader-focus-mode');
        applyReaderPrefs(false);
        syncToolbarUI();
      });

      $('body').append($toolbar);

      // 顶栏毛玻璃章节标题吸顶替换：滑过章节标题后隐藏顶部导航，把当前章节标题丝滑缩小固定在顶栏
      var navMain = document.getElementById('main-nav');
      var secTitleEl = document.getElementById('nav-section-title');
      if (navMain && !secTitleEl) {
        secTitleEl = document.createElement('div');
        secTitleEl.id = 'nav-section-title';
        secTitleEl.className = 'nav-section-title';
        secTitleEl.title = '点击回到本节开头';
        secTitleEl.addEventListener('click', function() {
          var targetId = secTitleEl.getAttribute('data-target-id');
          var el = targetId ? document.getElementById(targetId) : null;
          if (el) {
            $('html, body').stop().animate({ scrollTop: Math.max(0, $(el).offset().top - 56) }, 280);
          }
        });
        navMain.appendChild(secTitleEl);
      }

      function updateStickySectionHeader() {
        var navOuter = document.getElementById('nav-outer');
        var titleBox = document.getElementById('nav-section-title');
        if (!navOuter || !titleBox) return;
        var isPost = $('.article-entry').length && !$('#content').hasClass('is-home') && !$('.archives-wrap').length && !$('#ask-page').length && !$('.article-type-about').length;
        if (!isPost) {
          navOuter.classList.remove('has-active-section', 'is-scrolled-fade');
          return;
        }
        var entryEl = document.querySelector('.article-entry');
        if (entryEl) {
          var toggleEl = document.getElementById('main-nav-toggle');
          var minLeft = 52;
          if (toggleEl) {
            var tRect = toggleEl.getBoundingClientRect();
            if (tRect.width > 0) minLeft = Math.round(tRect.right + 12);
          }
          var entryLeft = Math.round(entryEl.getBoundingClientRect().left);
          titleBox.style.left = Math.max(minLeft, entryLeft) + 'px';
        }
        var headings = document.querySelectorAll('.article-entry h1, .article-entry h2, .article-entry h3');
        var activeH = null;
        for (var i = 0; i < headings.length; i++) {
          var rect = headings[i].getBoundingClientRect();
          if (rect.top <= 66) {
            activeH = headings[i];
          } else {
            break;
          }
        }
        if (activeH) {
          var clone = activeH.cloneNode(true);
          var numSpan = clone.querySelector('.heading-sec-num');
          if (numSpan) numSpan.remove();
          var cleanText = (clone.textContent || '').trim();
          if (titleBox.textContent !== cleanText) {
            titleBox.textContent = cleanText;
            titleBox.setAttribute('data-target-id', activeH.id || '');
          }
          navOuter.classList.add('has-active-section');
        } else {
          navOuter.classList.remove('has-active-section');
        }
      }
      updateStickySectionHeader();
      window.__updateStickySectionHeader = updateStickySectionHeader;

      if (!window.__articleNavScrollFadeBound) {
        window.__articleNavScrollFadeBound = true;
        window.addEventListener('scroll', function() {
          if (window.__updateStickySectionHeader) window.__updateStickySectionHeader();
        }, { passive: true });
        window.addEventListener('resize', function() {
          if (window.__updateStickySectionHeader) window.__updateStickySectionHeader();
        });
      }

      if (!window.__readerToolbarGlobalBound) {
        window.__readerToolbarGlobalBound = true;
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && document.documentElement.classList.contains('reader-focus-mode')) {
            var p = {};
            try { p = JSON.parse(localStorage.getItem('heptazero_reader_prefs') || '{}'); } catch (err) {}
            p.focus = false;
            try { localStorage.setItem('heptazero_reader_prefs', JSON.stringify(p)); } catch (err) {}
            document.documentElement.classList.remove('reader-focus-mode');
            $('[data-reader-focus]').removeClass('is-active');
            if (window.__layoutSidenotes) window.__layoutSidenotes();
          }
        });
      }
    } else {
      $('html').removeClass('reader-focus-mode reader-width-narrow reader-width-wide');
      $('#nav-outer').removeClass('is-scrolled-fade has-active-section');
    }

    // 6.8 文章页评论区右侧留白：准周期机械连杆画笔 + 首页大标题傅里叶轮廓描摹
    $('.epicycle-pen-wrap, .fourier-title-canvas').remove();
    $('#header-title #logo').removeClass('fourier-hidden').css('display', '');
    if (window.__epicycleRafId) {
      cancelAnimationFrame(window.__epicycleRafId);
      window.__epicycleRafId = null;
    }
    if (window.__fourierTitleRafId) {
      cancelAnimationFrame(window.__fourierTitleRafId);
      window.__fourierTitleRafId = null;
    }

    // 6.8a 首页大标题 "Heptazero" 复数傅里叶级数轮廓一笔描摹
    if (isHome) {
      var $logo = $('#header-title #logo');
      var titleText = ($logo.text() || 'Heptazero').trim();
      var $fCanvas = $('<canvas class="fourier-title-canvas" title="点击重绘傅里叶标题轮廓 / 双击显隐本轮连杆"></canvas>');
      $logo.addClass('fourier-hidden').css('display', 'none').after($fCanvas);
      var fCanvas = $fCanvas[0];

      function startFourierTitle() {
        if (!fCanvas || !fCanvas.getContext || !document.body.contains(fCanvas)) return;
        var ctx = fCanvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 420, H = 130;
        fCanvas.width = W * dpr;
        fCanvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        // 1. 离屏渲染标题字体并用亚像素 Marching Squares 提取严格闭合的无交叉轮廓环
        var off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        var octx = off.getContext('2d');
        octx.font = '700 44px "Noto Serif SC", Georgia, serif';
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillStyle = '#000';
        octx.fillText(titleText, W / 2, H / 2);

        var img = octx.getImageData(0, 0, W, H).data;
        function alphaAt(px, py) {
          if (px < 0 || px >= W || py < 0 || py >= H) return 0;
          return img[(py * W + px) * 4 + 3];
        }
        var T = 128;
        function lerpEdge(v0, v1) {
          var d = v1 - v0;
          if (Math.abs(d) < 1e-5) return 0.5;
          var u = (T - v0) / d;
          return u < 0 ? 0 : (u > 1 ? 1 : u);
        }

        var edgePtsMap = {};
        var nextEdgeMap = {};
        var WH = W * H;
        function setDirEdge(inKey, outKey, pIn, pOut) {
          edgePtsMap[inKey] = pIn;
          edgePtsMap[outKey] = pOut;
          nextEdgeMap[inKey] = outKey;
        }

        for (var y = 0; y < H - 1; y++) {
          for (var x = 0; x < W - 1; x++) {
            var a00 = alphaAt(x, y);
            var a10 = alphaAt(x + 1, y);
            var a11 = alphaAt(x + 1, y + 1);
            var a01 = alphaAt(x, y + 1);
            var mask = (a00 >= T ? 1 : 0) | (a10 >= T ? 2 : 0) | (a11 >= T ? 4 : 0) | (a01 >= T ? 8 : 0);
            if (mask === 0 || mask === 15) continue;

            var k0 = y * W + x;
            var k1 = WH + y * W + (x + 1);
            var k2 = (y + 1) * W + x;
            var k3 = WH + y * W + x;

            var p0 = { x: x + lerpEdge(a00, a10), y: y };
            var p1 = { x: x + 1, y: y + lerpEdge(a10, a11) };
            var p2 = { x: x + lerpEdge(a01, a11), y: y + 1 };
            var p3 = { x: x, y: y + lerpEdge(a00, a01) };

            if (mask === 1) setDirEdge(k3, k0, p3, p0);
            else if (mask === 2) setDirEdge(k0, k1, p0, p1);
            else if (mask === 3) setDirEdge(k3, k1, p3, p1);
            else if (mask === 4) setDirEdge(k1, k2, p1, p2);
            else if (mask === 5) { setDirEdge(k3, k2, p3, p2); setDirEdge(k1, k0, p1, p0); }
            else if (mask === 6) setDirEdge(k0, k2, p0, p2);
            else if (mask === 7) setDirEdge(k3, k2, p3, p2);
            else if (mask === 8) setDirEdge(k2, k3, p2, p3);
            else if (mask === 9) setDirEdge(k2, k0, p2, p0);
            else if (mask === 10) { setDirEdge(k0, k3, p0, p3); setDirEdge(k2, k1, p2, p1); }
            else if (mask === 11) setDirEdge(k2, k1, p2, p1);
            else if (mask === 12) setDirEdge(k1, k3, p1, p3);
            else if (mask === 13) setDirEdge(k1, k0, p1, p0);
            else if (mask === 14) setDirEdge(k0, k3, p0, p3);
          }
        }

        // 2. 追踪所有独立的闭合轮廓环并按从左到右排序
        var visitedKey = {};
        var loops = [];
        for (var startKey in nextEdgeMap) {
          if (!nextEdgeMap.hasOwnProperty(startKey) || visitedKey[startKey]) continue;
          var loop = [];
          var curr = startKey;
          var minX = Infinity, sumX = 0, sumY = 0;
          while (curr !== undefined && !visitedKey[curr]) {
            visitedKey[curr] = true;
            var pt = edgePtsMap[curr];
            if (pt) {
              loop.push({ x: pt.x, y: pt.y });
              if (pt.x < minX) minX = pt.x;
              sumX += pt.x;
              sumY += pt.y;
            }
            curr = nextEdgeMap[curr];
          }
          if (loop.length >= 14) {
            // 对闭合环做 2 轮轻微平滑
            for (var lp = 0; lp < 2; lp++) {
              var sm = [];
              var L = loop.length;
              for (var li = 0; li < L; li++) {
                var pPrev = loop[(li - 1 + L) % L];
                var pCur = loop[li];
                var pNext = loop[(li + 1) % L];
                sm.push({
                  x: 0.2 * pPrev.x + 0.6 * pCur.x + 0.2 * pNext.x,
                  y: 0.2 * pPrev.y + 0.6 * pCur.y + 0.2 * pNext.y
                });
              }
              loop = sm;
            }
            loops.push({
              pts: loop,
              minX: minX,
              cx: sumX / loop.length,
              cy: sumY / loop.length
            });
          }
        }

        if (!loops.length) {
          $logo.removeClass('fourier-hidden').css('display', '');
          $fCanvas.remove();
          return;
        }

        // 先取最左侧轮廓环，之后每次挑选距离当前环最接近且靠右的下一个环（同字母内环紧随外环）
        loops.sort(function(a, b) { return a.minX - b.minX; });
        var orderedLoops = [loops[0]];
        loops[0].used = true;
        for (var stepL = 1; stepL < loops.length; stepL++) {
          var prevL = orderedLoops[orderedLoops.length - 1];
          var bestL = -1, bestScore = Infinity;
          for (var lj = 0; lj < loops.length; lj++) {
            if (loops[lj].used) continue;
            var cand = loops[lj];
            var dxL = cand.cx - prevL.cx;
            var dyL = cand.cy - prevL.cy;
            var distL = Math.hypot(dxL, dyL);
            // 同一个字母的内外环（水平中心几乎重合）优先连续画完，否则向右推进到下一个字母
            var score = Math.abs(dxL) < 14 ? distL * 0.4 : (cand.minX - prevL.cx) + distL * 0.5 + (dxL < -14 ? 500 : 0);
            if (score < bestScore) {
              bestScore = score;
              bestL = lj;
            }
          }
          if (bestL === -1) break;
          loops[bestL].used = true;
          orderedLoops.push(loops[bestL]);
        }

        // 3. 旋转每个闭合环使其起点最靠近上一环终点，并在环与环之间插入余弦平滑过渡桥（消除阶跃跳变与吉布斯振荡）
        var rawTrack = [];
        var lastExit = { x: orderedLoops[0].pts[0].x, y: orderedLoops[0].pts[0].y };
        for (var oi = 0; oi < orderedLoops.length; oi++) {
          var lPts = orderedLoops[oi].pts;
          var bestStart = 0, bestD = Infinity;
          for (var si = 0; si < lPts.length; si++) {
            var d = Math.hypot(lPts[si].x - lastExit.x, lPts[si].y - lastExit.y);
            if (d < bestD) { bestD = d; bestStart = si; }
          }
          var entryPt = lPts[bestStart];
          if (oi > 0) {
            for (var dw0 = 0; dw0 < 2; dw0++) {
              rawTrack.push({ x: lastExit.x, y: lastExit.y, pen: false });
            }
            var gap = Math.hypot(entryPt.x - lastExit.x, entryPt.y - lastExit.y);
            var bridgeCount = Math.max(4, Math.min(18, Math.round(gap / 3.5)));
            for (var bi = 1; bi <= bridgeCount; bi++) {
              var u = 0.5 - 0.5 * Math.cos((Math.PI * bi) / (bridgeCount + 1));
              rawTrack.push({
                x: lastExit.x + (entryPt.x - lastExit.x) * u,
                y: lastExit.y + (entryPt.y - lastExit.y) * u,
                pen: false
              });
            }
            for (var dw1 = 0; dw1 < 2; dw1++) {
              rawTrack.push({ x: entryPt.x, y: entryPt.y, pen: false });
            }
          }
          for (var pi = 0; pi <= lPts.length; pi++) {
            var p = lPts[(bestStart + pi) % lPts.length];
            rawTrack.push({ x: p.x, y: p.y, pen: true });
          }
          lastExit = entryPt;
        }
        // 句末 o 回到句首 H 的平滑余弦闭合回桥（两端驻留刹停 + 抬笔移动，彻底消除跨屏三角尖刺与入笔拐角牵引）
        var firstPt = rawTrack[0];
        for (var dw2 = 0; dw2 < 2; dw2++) {
          rawTrack.push({ x: lastExit.x, y: lastExit.y, pen: false });
        }
        var returnCount = 34;
        for (var ri = 1; ri <= returnCount; ri++) {
          var ru = 0.5 - 0.5 * Math.cos((Math.PI * ri) / (returnCount + 1));
          rawTrack.push({
            x: lastExit.x + (firstPt.x - lastExit.x) * ru,
            y: lastExit.y + (firstPt.y - lastExit.y) * ru,
            pen: false
          });
        }
        for (var dw3 = 0; dw3 < 2; dw3++) {
          rawTrack.push({ x: firstPt.x, y: firstPt.y, pen: false });
        }

        // 4. 抽取 N 个周期采样点并记录每段的落笔/抬笔状态
        var N = 640;
        var samples = [];
        var penMask = [];
        for (var k = 0; k < N; k++) {
          var idx = Math.floor((k * rawTrack.length) / N);
          var rPt = rawTrack[idx];
          samples.push({ re: rPt.x - W / 2, im: rPt.y - H / 2 });
          penMask.push(!!rPt.pen);
        }

        // 5. 计算复数离散傅里叶变换 (Complex DFT) + Lanczos sigma 平滑因子抑制高频振铃
        var M = 220;
        var epicycles = [];
        for (var freq = -M; freq <= M; freq++) {
          var sumRe = 0, sumIm = 0;
          for (var n = 0; n < N; n++) {
            var theta = (-2 * Math.PI * freq * n) / N;
            var c = Math.cos(theta), s = Math.sin(theta);
            sumRe += samples[n].re * c - samples[n].im * s;
            sumIm += samples[n].re * s + samples[n].im * c;
          }
          sumRe /= N;
          sumIm /= N;
          // 轻微 Lanczos 窗函数衰减极高频谐波，彻底消除过采样插值抖动
          var sigma = 1;
          if (freq !== 0) {
            var arg = (Math.PI * Math.abs(freq)) / (M + 1);
            sigma = Math.pow(Math.sin(arg) / arg, 0.55);
          }
          epicycles.push({
            freq: freq,
            amp: Math.hypot(sumRe, sumIm) * sigma,
            phase: Math.atan2(sumIm, sumRe)
          });
        }
        // 按振幅从大到小排序（DC 分量 freq=0 置顶）
        epicycles.sort(function(a, b) {
          if (a.freq === 0) return -1;
          if (b.freq === 0) return 1;
          return b.amp - a.amp;
        });

        var cycleSteps = 1280;
        var maxPathLen = Math.floor(cycleSteps * 0.93);
        var path = [];
        var stepCounter = 0;
        var showGears = true;

        var fClickTimer = null;
        fCanvas.onclick = function() {
          if (fClickTimer) {
            clearTimeout(fClickTimer);
            fClickTimer = null;
            showGears = !showGears;
          } else {
            fClickTimer = setTimeout(function() {
              fClickTimer = null;
              path.length = 0;
              stepCounter = 0;
            }, 220);
          }
        };

        function renderFourierFrame() {
          if (!document.body.contains(fCanvas)) {
            window.__fourierTitleRafId = null;
            return;
          }
          if (!document.hidden) {
            ctx.clearRect(0, 0, W, H);
            var isDark = document.documentElement.classList.contains('dark-mode');
            var inkRGB = isDark ? '255, 45, 117' : '0, 133, 161';
            var inkColor = isDark ? '#ff2d75' : '#0085a1';
            var ghostColor = isDark ? 'rgba(248, 250, 252, 0.08)' : 'rgba(15, 23, 42, 0.07)';
            var orbitColor = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)';
            var rodColor = isDark ? 'rgba(255, 45, 117, 0.45)' : 'rgba(0, 133, 161, 0.42)';

            // 底层极淡字模底稿
            ctx.font = '700 44px "Noto Serif SC", Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = ghostColor;
            ctx.fillText(titleText, W / 2, H / 2);

            var t = (2 * Math.PI * stepCounter) / cycleSteps;
            var sampleIdx = Math.floor((stepCounter * N) / cycleSteps) % N;
            var isPenDown = penMask[sampleIdx];

            var x = W / 2, y = H / 2;
            var joints = [{ x: x, y: y }];
            for (var i = 0; i < epicycles.length; i++) {
              var ep = epicycles[i];
              var prevX = x, prevY = y;
              var ang = ep.freq * t + ep.phase;
              x += ep.amp * Math.cos(ang);
              y += ep.amp * Math.sin(ang);
              if (i < 28 && ep.amp > 0.6) {
                joints.push({ px: prevX, py: prevY, x: x, y: y, r: ep.amp });
              }
            }

            path.push({ x: x, y: y, pen: isPenDown });
            if (path.length > maxPathLen) {
              path.shift();
            }
            stepCounter = (stepCounter + 1) % cycleSteps;

            // 绘制循环渐隐的标题轮廓（仅在轮廓环 pen=true 时落笔，跨环过渡与句末回桥自动抬笔）
            if (path.length > 1) {
              for (var pIdx = 1; pIdx < path.length; pIdx++) {
                var p0 = path[pIdx - 1], p1 = path[pIdx];
                if (!p0.pen || !p1.pen) continue;
                var jumpDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                if (jumpDist > 12) continue;
                var fade = Math.pow(pIdx / path.length, 0.65);
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.strokeStyle = 'rgba(' + inkRGB + ', ' + (0.94 * fade).toFixed(3) + ')';
                ctx.lineWidth = 1.55;
                ctx.lineCap = 'round';
                ctx.stroke();
              }
            }

            // 常驻绘制前 28 阶本轮圆环与连杆，首尾循环不断
            if (showGears) {
              for (var g = 1; g < joints.length; g++) {
                var jt = joints[g];
                ctx.beginPath();
                ctx.arc(jt.px, jt.py, jt.r, 0, Math.PI * 2);
                ctx.strokeStyle = orbitColor;
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }
              ctx.beginPath();
              ctx.moveTo(W / 2, H / 2);
              for (var rIdx = 1; rIdx < joints.length; rIdx++) {
                ctx.lineTo(joints[rIdx].x, joints[rIdx].y);
              }
              ctx.lineTo(x, y);
              ctx.strokeStyle = rodColor;
              ctx.lineWidth = 1.1;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(x, y, 2.8, 0, Math.PI * 2);
              ctx.fillStyle = inkColor;
              ctx.fill();
            }
          }
          window.__fourierTitleRafId = requestAnimationFrame(renderFourierFrame);
        }
        window.__fourierTitleRafId = requestAnimationFrame(renderFourierFrame);
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(startFourierTitle);
      } else {
        setTimeout(startFourierTitle, 150);
      }
    }
    var $commentsSection = $('#comments');
    if (isPostPage && $commentsSection.length) {
      var $penWrap = $('<div class="epicycle-pen-wrap"><canvas class="epicycle-pen-canvas" title="点击换一组随机初值 / 双击显隐连杆"></canvas></div>');
      $commentsSection.append($penWrap);
      var canvas = $penWrap.find('canvas')[0];
      if (canvas && canvas.getContext) {
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var size = 200;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        var arms = [
          { r: 36, w: 1.0, p: 0 },
          { r: 24, w: -Math.SQRT2, p: 0 },
          { r: 15, w: Math.PI - 1, p: 0 },
          { r: 9,  w: -2.3 * ((Math.sqrt(5) - 1) / 2), p: 0 }
        ];
        var trail = [];
        var maxTrail = 600;
        var showRods = true;
        var t = 0;

        function computeJoints(timeVal) {
          var x = size / 2, y = size / 2;
          var joints = [{ x: x, y: y }];
          for (var i = 0; i < arms.length; i++) {
            var a = arms[i];
            var ang = a.w * timeVal + a.p;
            x += a.r * Math.cos(ang);
            y += a.r * Math.sin(ang);
            joints.push({ x: x, y: y, r: a.r });
          }
          return joints;
        }

        function randomizePhases() {
          for (var i = 0; i < arms.length; i++) {
            arms[i].p = Math.random() * Math.PI * 2;
          }
          trail.length = 0;
          t = 0;
          // 预热一段初始墨迹，避免刚滚到底部时一片空白
          for (var wStep = 0; wStep < 180; wStep++) {
            var jts = computeJoints(t);
            var tip = jts[jts.length - 1];
            trail.push({ x: tip.x, y: tip.y });
            t += 0.022;
          }
        }
        randomizePhases();

        var clickTimer = null;
        canvas.addEventListener('click', function() {
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            showRods = !showRods;
          } else {
            clickTimer = setTimeout(function() {
              clickTimer = null;
              randomizePhases();
            }, 220);
          }
        });

        function stepEpicycle() {
          if (!document.body.contains(canvas)) {
            window.__epicycleRafId = null;
            return;
          }
          if (!document.hidden && window.innerWidth > 1100) {
            // 每帧推进 2 个微步，速度加快约 2.5 倍且曲线依然平滑圆润
            var joints = null;
            for (var s = 0; s < 2; s++) {
              joints = computeJoints(t);
              var tip = joints[joints.length - 1];
              trail.push({ x: tip.x, y: tip.y });
              if (trail.length > maxTrail) trail.shift();
              t += 0.021;
            }

            ctx.clearRect(0, 0, size, size);
            var isDark = document.documentElement.classList.contains('dark-mode');
            var inkRGB = isDark ? '255, 45, 117' : '0, 133, 161';
            var orbitStroke = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)';
            var rodStroke = isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.52)';

            if (showRods) {
              for (var i = 0; i < arms.length; i++) {
                ctx.beginPath();
                ctx.arc(joints[i].x, joints[i].y, arms[i].r, 0, Math.PI * 2);
                ctx.strokeStyle = orbitStroke;
                ctx.lineWidth = 0.9;
                ctx.stroke();
              }
            }

            // 渐隐墨迹轨迹
            if (trail.length > 2) {
              for (var k = 1; k < trail.length; k++) {
                var alpha = Math.pow(k / trail.length, 1.6) * 0.86;
                ctx.beginPath();
                ctx.moveTo(trail[k - 1].x, trail[k - 1].y);
                ctx.lineTo(trail[k].x, trail[k].y);
                ctx.strokeStyle = 'rgba(' + inkRGB + ', ' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 1.45;
                ctx.lineCap = 'round';
                ctx.stroke();
              }
            }

            // 机械连杆与笔尖
            if (showRods) {
              ctx.beginPath();
              ctx.moveTo(joints[0].x, joints[0].y);
              for (var j = 1; j < joints.length; j++) {
                ctx.lineTo(joints[j].x, joints[j].y);
              }
              ctx.strokeStyle = rodStroke;
              ctx.lineWidth = 1.25;
              ctx.lineJoin = 'round';
              ctx.stroke();
            }

            var lastTip = joints[joints.length - 1];
            ctx.beginPath();
            ctx.arc(lastTip.x, lastTip.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(' + inkRGB + ')';
            ctx.fill();
          }
          window.__epicycleRafId = requestAnimationFrame(stepEpicycle);
        }
        window.__epicycleRafId = requestAnimationFrame(stepEpicycle);
      }
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
    initNavToggleBars();
    renderGlobalMobileNav();
    renderGlobalSubNav();
    updateNavActiveState();
    layoutPriorityNav();
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

  function toggleTheme(e) {
    var current = document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light';
    var next = (current === 'dark') ? 'light' : 'dark';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduceMotion) {
      applyTheme(next, true);
      return;
    }

    var x = (e && typeof e.clientX === 'number' && e.clientX > 0) ? e.clientX : window.innerWidth - 40;
    var y = (e && typeof e.clientY === 'number' && e.clientY > 0) ? e.clientY : 30;
    var endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    var isMobileDevice = window.innerWidth <= 810 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    document.documentElement.classList.add('is-theme-transitioning');
    var transition = document.startViewTransition(function() {
      applyTheme(next, true);
    });
    if (transition.finished && transition.finished.then) {
      transition.finished.then(function() {
        document.documentElement.classList.remove('is-theme-transitioning');
      }, function() {
        document.documentElement.classList.remove('is-theme-transitioning');
      });
    } else {
      setTimeout(function() {
        document.documentElement.classList.remove('is-theme-transitioning');
      }, 950);
    }

    transition.ready.then(function() {
      if (isMobileDevice) {
        // 移动端真机跳过极其消耗 Retina GPU 填充率的双层实时高斯模糊，仅执行硬件合成的圆形 clip-path 扩散
        document.documentElement.animate(
          [
            { clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)' },
            { clipPath: 'circle(' + Math.round(endRadius) + 'px at ' + x + 'px ' + y + 'px)' }
          ],
          {
            duration: 560,
            easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
        return;
      }
      document.documentElement.animate(
        [
          { clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)', filter: 'blur(10px)', offset: 0 },
          { clipPath: 'circle(' + Math.round(endRadius * 0.38) + 'px at ' + x + 'px ' + y + 'px)', filter: 'blur(8px)', offset: 0.42 },
          { clipPath: 'circle(' + Math.round(endRadius * 0.82) + 'px at ' + x + 'px ' + y + 'px)', filter: 'blur(3px)', offset: 0.78 },
          { clipPath: 'circle(' + endRadius + 'px at ' + x + 'px ' + y + 'px)', filter: 'blur(0px)', offset: 1 }
        ],
        {
          duration: 920,
          easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
      document.documentElement.animate(
        [
          { filter: 'blur(0px)', opacity: 1 },
          { filter: 'blur(4px)', opacity: 0.92 }
        ],
        {
          duration: 920,
          easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
          pseudoElement: '::view-transition-old(root)'
        }
      );
    });
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
  // 顶栏右侧辅助操作区（联系方式、语言、深色模式统一收纳进侧边栏底部，顶栏保持极简）
  // -------------------------------------------------------------
  function renderGlobalSubNav() {
    var $subNav = $('#sub-nav');
    if (!$subNav.length) return;
    $subNav.find('.sub-nav-social, .lang-toggle-btn, .theme-toggle-btn').remove();
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
        var groupHref = group.href || '/tags/personal.html';
        var chevronSvg = '<svg viewBox="0 0 12 12" width="11" height="11" stroke="currentColor" stroke-width="1.65" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 4.2 6 7.8 9.5 4.2"></polyline></svg>';
        treeGroupsHtml += '<li class="category-list-item tag-tree-open">' +
          '<div class="category-item-row tag-tree-toggle" role="button">' +
          '  <span class="tag-tree-arrow">' + chevronSvg + '</span>' +
          '  <a class="category-group-link category-list-name" href="' + groupHref + '">' + group.name + '</a>' +
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
    var avatarLink = document.getElementById('nav-avatar-link');
    if (avatarLink) {
      if (filename === 'about.html') avatarLink.classList.add('current');
      else avatarLink.classList.remove('current');
    }
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

  function initNavToggleBars() {
    var toggle = document.getElementById('main-nav-toggle');
    if (toggle && !toggle.classList.contains('has-bars')) {
      toggle.classList.add('has-bars');
      toggle.innerHTML = '<span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span>';
    }
  }

  // 渐进式优先级导航：按 Log -> Ask -> About -> Archives 顺序逐个折叠，不重叠
  function layoutPriorityNav() {
    var nav = document.getElementById('main-nav');
    var linksWrap = document.querySelector('.main-nav-links');
    var subNav = document.getElementById('sub-nav');
    if (!nav || !linksWrap || !subNav) return;

    var social = subNav.querySelector('.sub-nav-social');
    var allLinks = Array.prototype.slice.call(linksWrap.querySelectorAll('.main-nav-link'));
    if (social) social.classList.remove('nav-is-folded');
    allLinks.forEach(function(el) { el.classList.remove('nav-is-folded'); });

    function hasCollision() {
      var toggle = document.getElementById('main-nav-toggle');
      var leftEdge = 20;
      if (toggle) {
        var tRect = toggle.getBoundingClientRect();
        if (tRect.width > 0) {
          leftEdge = Math.max(leftEdge, tRect.right);
        }
      }
      var rightEdge = window.innerWidth - 20;
      if (subNav && subNav.children.length > 0) {
        var sRect = subNav.getBoundingClientRect();
        if (sRect.width > 0) {
          rightEdge = Math.min(rightEdge, sRect.left);
        }
      }
      var lRect = linksWrap.getBoundingClientRect();
      return (lRect.left < leftEdge + 16) || (lRect.right > rightEdge - 16);
    }

    if (hasCollision() && social) {
      social.classList.add('nav-is-folded');
    }

    // 折叠优先级：Log -> Ask -> Archives -> Home（当前所在页面最后保留）
    var foldOrder = ['/log.html', '/ask.html', '/archives.html', '/index.html'];
    for (var pass = 0; pass < 2 && hasCollision(); pass++) {
      for (var i = 0; i < foldOrder.length && hasCollision(); i++) {
        var href = foldOrder[i];
        for (var j = 0; j < allLinks.length; j++) {
          var a = allLinks[j];
          if (a.classList.contains('nav-is-folded')) continue;
          if (pass === 0 && a.classList.contains('current')) continue;
          if ((a.getAttribute('href') || '').indexOf(href) !== -1) {
            a.classList.add('nav-is-folded');
            break;
          }
        }
      }
    }
  }

  function renderNavDropdown() {
    var dd = document.getElementById('nav-dropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'nav-dropdown';
      dd.className = 'nav-dropdown';
      document.body.appendChild(dd);
    }
    var siteData = window.SITE_DATA || { github: 'https://github.com/HeptaZero', email: '1004752777@qq.com' };

    var foldedLinks = [];
    var allLinks = [];
    $('.main-nav-links .main-nav-link').each(function() {
      var $a = $(this);
      var item = { href: $a.attr('href'), text: $a.text(), current: $a.hasClass('current') };
      allLinks.push(item);
      if ($a.hasClass('nav-is-folded')) {
        foldedLinks.push(item);
      }
    });
    var navHasActiveSection = $('#nav-outer').hasClass('has-active-section');
    var listToRender = (foldedLinks.length && !navHasActiveSection) ? foldedLinks : allLinks;

    var navHtml = '<div class="nav-dropdown-links">';
    $.each(listToRender, function(_, item) {
      var cls = item.current ? 'nav-dropdown-link current' : 'nav-dropdown-link';
      navHtml += '<a class="' + cls + '" href="' + item.href + '">' + item.text + '</a>';
    });
    var drawerLabel = currentArticleTocHtml ? '文章大纲' : '标签树';
    navHtml += '<button type="button" class="nav-dropdown-link nav-dropdown-drawer-btn" style="width:100%;text-align:left;background:none;border:0;border-top:1px solid rgba(0,0,0,0.06);cursor:pointer;font-family:inherit;">' + drawerLabel + '</button>';
    navHtml += '</div>';

    dd.innerHTML = navHtml;

    // 锚定到三横按钮正下方
    var toggle = document.getElementById('main-nav-toggle');
    if (toggle) {
      var rect = toggle.getBoundingClientRect();
      dd.style.top = Math.round(rect.bottom + 8) + 'px';
      if (rect.left > window.innerWidth / 2) {
        dd.style.left = 'auto';
        dd.style.right = Math.max(14, Math.round(window.innerWidth - rect.right)) + 'px';
        dd.style.transformOrigin = 'top right';
      } else {
        dd.style.right = 'auto';
        dd.style.left = Math.max(14, Math.round(rect.left)) + 'px';
        dd.style.transformOrigin = 'top left';
      }
    }
  }

  initNavToggleBars();
  layoutPriorityNav();
  if (!window.__priorityNavBound) {
    window.__priorityNavBound = true;
    window.addEventListener('resize', layoutPriorityNav);
  }

  document.addEventListener('click', function(e) {
    var target = e.target;

    // 切换深色/浅色模式（PC 顶栏与移动端抽屉底部通用）
    var themeBtn = target.closest ? target.closest('.theme-toggle-btn') : null;
    if (themeBtn) {
      e.preventDefault();
      toggleTheme(e);
      return;
    }

    // 切换语言按钮（PC 顶栏与移动端抽屉底部通用）
    var langBtn = target.closest ? target.closest('.lang-toggle-btn') : null;
    if (langBtn) {
      e.preventDefault();
      showToast('英文版本正在整理中 / English version in progress...');
      return;
    }

    var ddEl = document.getElementById('nav-dropdown');
    if (ddEl && ddEl.classList.contains('is-open')) {
      var inDd = target.closest ? target.closest('#nav-dropdown') : null;
      var ddLink = target.closest ? target.closest('#nav-dropdown a') : null;
      var isToggle = target.closest ? target.closest('#main-nav-toggle') : null;
      if ((!inDd && !isToggle) || ddLink) {
        ddEl.classList.remove('is-open');
        $('#main-nav-toggle').removeClass('is-open');
      }
    }

    var drawerTrigger = target.closest ? target.closest('.nav-dropdown-drawer-btn') : null;
    if (drawerTrigger) {
      e.preventDefault();
      e.stopPropagation();
      if (ddEl) ddEl.classList.remove('is-open');
      $container.addClass('mobile-nav-on');
      $('#main-nav-toggle').addClass('is-open');
      return;
    }

    var toggleBtn = target.closest ? target.closest('#main-nav-toggle') : null;
    if (toggleBtn) {
      e.preventDefault();
      if ($container.hasClass('mobile-nav-on')) {
        $container.removeClass('mobile-nav-on');
        toggleBtn.classList.remove('is-open');
        return;
      }
      if ($('.nav-is-folded').length) {
        renderNavDropdown();
        var dd = document.getElementById('nav-dropdown');
        if (dd) {
          var willOpen = !dd.classList.contains('is-open');
          dd.classList.toggle('is-open', willOpen);
          if (willOpen) toggleBtn.classList.add('is-open');
          else toggleBtn.classList.remove('is-open');
        }
        return;
      }
      if (isMobileNavAnim) return;
      startMobileNavAnim();
      var openSide = !$container.hasClass('mobile-nav-on');
      $container.toggleClass('mobile-nav-on', openSide);
      if (openSide) toggleBtn.classList.add('is-open');
      else toggleBtn.classList.remove('is-open');
      stopMobileNavAnim();
      return;
    }

    var dimTarget = target.closest ? target.closest('#mobile-nav-dim') : null;
    if (dimTarget) {
      if (isMobileNavAnim) return;
      startMobileNavAnim();
      $container.removeClass('mobile-nav-on');
      $('#main-nav-toggle').removeClass('is-open');
      stopMobileNavAnim();
      return;
    }

    var tocLink = target.closest ? target.closest('.mobile-nav-toc .toc-link') : null;
    if (tocLink) {
      var href = tocLink.getAttribute('href');
      $container.removeClass('mobile-nav-on');
      $('#main-nav-toggle').removeClass('is-open');
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

    var tagGroupLink = target.closest ? target.closest('.category-group-link') : null;
    var tagToggle = target.closest ? target.closest('.tag-tree-toggle') : null;
    if (tagToggle && !tagGroupLink) {
      var item = tagToggle.closest('.category-list-item');
      if (item) item.classList.toggle('tag-tree-open');
      return;
    }

    var mobileNavLink = target.closest ? target.closest('#mobile-nav a') : null;
    if (mobileNavLink) {
      $container.removeClass('mobile-nav-on');
      var tBtn = document.getElementById('main-nav-toggle');
      if (tBtn) tBtn.classList.remove('is-open');
    }

    if ($container.hasClass('mobile-nav-on')) {
      var inMobileNav = target.closest ? target.closest('#mobile-nav') : null;
      if (!inMobileNav) {
        $container.removeClass('mobile-nav-on');
        var tBtn2 = document.getElementById('main-nav-toggle');
        if (tBtn2) tBtn2.classList.remove('is-open');
      }
    }
  });

  // 全屏灯箱交互

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
          var tBtnReset = document.getElementById('main-nav-toggle');
          if (tBtnReset) tBtnReset.classList.remove('is-open');
          var ddReset = document.getElementById('nav-dropdown');
          if (ddReset) ddReset.classList.remove('is-open');

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

          // 5. 重置顶栏吸顶章节状态并更新历史记录（导航高亮由下方 initPage -> updateNavActiveState 统一维护）
          $('#nav-outer').removeClass('has-active-section is-scrolled-fade');

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
