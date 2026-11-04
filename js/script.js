(function($){
  // -------------------------------------------------------------
  // 页面正文组件初始化（图片灯箱、大纲自动生成、滚动监听、代码复制、KaTeX）
  // -------------------------------------------------------------
  function initPage() {
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

    // 3. 自动生成真层级大纲并挂载到 #floating-toc
    var $floatingToc = $('#floating-toc');
    var isHome = $('#content').hasClass('is-home');
    var isAbout = $('.article-type-about').length > 0 || window.location.pathname.indexOf('about.html') !== -1;
    var isAsk = $('#ask-page').length > 0 || window.location.pathname.indexOf('ask.html') !== -1;
    var $entry = $('.article-entry');

    if (!isHome && !isAbout && !isAsk && $floatingToc.length && $entry.length) {
      var $headings = $entry.find('h1, h2, h3, h4');
      if ($headings.length) {
        // 计算文章最高层级（有些从 h2 起步，有些如 blog-vision 从 h3 起步）
        var minLevel = 99;
        $headings.each(function() {
          var lvl = parseInt(this.tagName.substring(1), 10);
          if (lvl < minLevel) minLevel = lvl;
        });

        var tocHtml = '<div class="toc-header">目录</div><ol class="toc">';
        var currentTopLi = false;
        var inChildOl = false;

        $headings.each(function(idx) {
          var $h = $(this);
          var id = $h.attr('id');
          if (!id) {
            id = 'heading-' + idx;
            $h.attr('id', id);
          }
          var text = $h.text().replace(/^#+\s*/, '').trim();
          var tag = this.tagName.toLowerCase();
          var level = parseInt(tag.substring(1), 10);

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
        $floatingToc.html(tocHtml).show();
      } else {
        $floatingToc.empty().hide();
      }
    } else if ($floatingToc.length) {
      $floatingToc.empty().hide();
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

    // 5. 挂载与更新 Giscus 评论区
    function loadGiscus() {
      var commentsEl = document.getElementById('comments');
      if (!commentsEl) return;

      var iframe = document.querySelector('iframe.giscus-frame');
      if (iframe) {
        iframe.contentWindow.postMessage({
          giscus: {
            setConfig: {
              term: window.location.pathname
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
      script.setAttribute('data-theme', 'light');
      script.setAttribute('data-lang', 'zh-CN');
      script.setAttribute('crossorigin', 'anonymous');
      script.async = true;

      container.appendChild(script);
    }
    loadGiscus();

    // 立即执行一次大纲高亮计算，确保打开页面即处于激活状态
    setTimeout(updateScrollSpy, 50);

    // 渲染全站全局复用的侧边抽屉与顶栏活动状态
    renderGlobalMobileNav();
    updateNavActiveState();
  }

  // -------------------------------------------------------------
  // 全局移动端侧边抽屉组件（单点维护，全站 0 构建复用）
  // -------------------------------------------------------------
  function renderGlobalMobileNav() {
    var $mobileNav = $('#mobile-nav');
    if (!$mobileNav.length) return;

    var html = '';

    // 1. 若当前页面有目录生成，在抽屉顶部加入文章目录模块
    var $toc = $('#floating-toc .toc');
    if ($toc.length && $toc.children().length > 0) {
      html += '<div class="mobile-nav-toc">';
      html += '  <h3 class="widget-title">目录</h3>';
      html += '  <div class="mobile-toc-container"><ol class="toc">' + $toc.html() + '</ol></div>';
      html += '</div>';
    }

    // 2. 标签树模块
    html += '<div class="mobile-nav-categories">';
    html += '  <h3 class="widget-title">标签树</h3>';
    html += '  <ul class="category-list tag-tree">';
    html += '    <li class="category-list-item tag-tree-open">';
    html += '      <span class="category-list-link tag-tree-toggle">个人</span>';
    html += '      <span class="category-list-count">1</span>';
    html += '      <ul class="category-list-child">';
    html += '        <li class="category-list-item">';
    html += '          <a class="category-list-link" href="/tags/杂谈.html">杂谈</a>';
    html += '          <span class="category-list-count">1</span>';
    html += '        </li>';
    html += '      </ul>';
    html += '    </li>';
    html += '  </ul>';
    html += '</div>';

    // 3. 标签词云模块
    html += '<div class="mobile-nav-tagcloud">';
    html += '  <h3 class="widget-title">标签词云</h3>';
    html += '  <a href="/tags/杂谈.html" style="font-size: 15px; color: #999">杂谈</a>';
    html += '</div>';

    $mobileNav.html(html);
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
      $container.removeClass('mobile-nav-on');
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

  // TOC scroll spy（结合人体自然阅读视线基准线与触底锁定）
  function updateScrollSpy(){
    var scrollTop = $(window).scrollTop();
    var tocLinks = $('.toc-link');
    if (!tocLinks.length) return;
    var headers = [];

    tocLinks.each(function(){
      var href = $(this).attr('href');
      if (href && href.charAt(0) === '#') {
        var rawId = href.substring(1);
        try {
          var decoded = decodeURIComponent(rawId);
          var el = document.getElementById(decoded);
          if (el) {
            headers.push({
              link: $(this),
              header: $(el),
              top: $(el).offset().top
            });
          }
        } catch(e) {}
      }
    });

    if (!headers.length) return;

    var activeLink = null;
    var winHeight = $(window).height();
    var docHeight = $(document).height();
    var isBottom = (scrollTop + winHeight >= docHeight - 80);

    // 触底边缘检测：翻滚到文章末尾时直接锁定激活最后一节（解决短小尾章无法到达视线线问题）
    if (isBottom) {
      activeLink = headers[headers.length - 1].link;
    } else {
      // 自然阅读视线基准线（屏幕高度的 38%，居中偏上，最符合人类浏览网页时的注视落点）
      var triggerLine = scrollTop + winHeight * 0.38;
      for (var i = 0; i < headers.length; i++) {
        if (triggerLine >= headers[i].top) {
          activeLink = headers[i].link;
        } else {
          break;
        }
      }
    }

    // 初始加载页面且未滑到任何标题时，默认激活首个章节展开
    if (!activeLink && headers.length) {
      activeLink = headers[0].link;
    }

    $('.toc-link').removeClass('active');
    $('.toc-item').removeClass('active-current active-parent');

    if (activeLink) {
      activeLink.addClass('active');
      var $activeItem = activeLink.closest('.toc-item');
      $activeItem.addClass('active-current');

      // 向上溯源：激活所在的大节（展开文字与子集）
      var $parentH2 = activeLink.closest('.toc-level-2');
      if ($parentH2.length) {
        $parentH2.addClass('active-parent');
      }
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

    // 监听后退/前进
    window.addEventListener('popstate', function() {
      pjaxLoad(window.location.href, false);
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
