(function($){
  // -------------------------------------------------------------
  // 页面正文组件初始化（图片灯箱、大纲自动生成、滚动监听、代码复制、KaTeX）
  // -------------------------------------------------------------
  function initPage() {
    // 1. Caption & Fancybox（仅对非自定义画廊的普通图片包裹）
    $('.article-entry, .article-inner').each(function(i){
      $(this).find('img').each(function(){
        if ($(this).parent().hasClass('fancybox') || $(this).parent().is('a') || $(this).closest('.gallery-item').length) return;
        var alt = this.alt;
        if (alt) $(this).after('<span class="caption">' + alt + '</span>');
        $(this).wrap('<a class="fancybox" href="' + this.src + '" data-fancybox="gallery" data-caption="' + alt + '"></a>');
      });
      $(this).find('.fancybox').each(function(){
        $(this).attr('rel', 'article' + i);
      });
    });

    if ($.fancybox){
      $('.fancybox').fancybox();
    }

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
    var $entry = $('.article-entry');

    if (!isHome && !isAbout && $floatingToc.length && $entry.length) {
      var $headings = $entry.find('h1, h2, h3, h4');
      if ($headings.length) {
        // 计算文章最高层级（有些从 h2 起步，有些如 blog-vision 从 h3 起步）
        var minLevel = 99;
        $headings.each(function() {
          var lvl = parseInt(this.tagName.substring(1), 10);
          if (lvl < minLevel) minLevel = lvl;
        });

        var tocHtml = '<div class="toc-header">大纲</div><ol class="toc">';
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

        // 同步到手机端侧边栏抽屉
        var $mobileToc = $('.mobile-nav-toc');
        if ($mobileToc.length) {
          $mobileToc.find('.mobile-toc-container').html('<ol class="toc">' + $floatingToc.find('.toc').html() + '</ol>');
          $mobileToc.show();
        }
      } else {
        $floatingToc.empty().hide();
        $('.mobile-nav-toc').hide();
      }
    } else if ($floatingToc.length) {
      $floatingToc.empty().hide();
      $('.mobile-nav-toc').hide();
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

    // 立即执行一次大纲高亮计算，确保打开页面即处于激活状态
    setTimeout(updateScrollSpy, 50);
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

  var nav = document.getElementById('main-nav-toggle');
  if (nav) {
    nav.onclick = function(){
      if (isMobileNavAnim) return;
      startMobileNavAnim();
      $container.toggleClass('mobile-nav-on');
      stopMobileNavAnim();
    };
  }

  // 遮罩层点击关闭抽屉
  var dimEl = document.getElementById('mobile-nav-dim');
  if (!dimEl) {
    dimEl = document.createElement('div');
    dimEl.id = 'mobile-nav-dim';
    document.body.appendChild(dimEl);
  }
  dimEl.onclick = function() {
    if (isMobileNavAnim) return;
    startMobileNavAnim();
    $container.removeClass('mobile-nav-on');
    stopMobileNavAnim();
  };

  var wrap = document.getElementById('wrap');
  if (wrap) {
    wrap.onclick = function(e){
      if (isMobileNavAnim || !$container.hasClass('mobile-nav-on')) return;
      if ($(e.target).closest('#mobile-nav, #main-nav-toggle').length) return;
      $container.removeClass('mobile-nav-on');
    };
  }

  // 手机端点击大纲项后自动收起抽屉
  $('.mobile-nav-toc').delegate('.toc-link', 'click', function() {
    $('#container').removeClass('mobile-nav-on');
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

  // 标签树折叠/展开
  $('.tag-tree-toggle').click(function () {
    $(this).closest('.category-list-item').toggleClass('tag-tree-open');
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

          // 3. 原地替换正文内容区
          var newContent = newDoc.getElementById('content');
          var oldContent = document.getElementById('content');
          if (newContent && oldContent) {
            oldContent.innerHTML = newContent.innerHTML;
            oldContent.className = newContent.className;
          }

          // 4. 原地同步大纲容器（仅当新页面为文章页且含有标题时才显示；About 与 Home 均不大纲化）
          var isAboutPage = url.indexOf('about.html') !== -1 || !!newDoc.querySelector('.article-type-about');
          var hasHeadings = !isAboutPage && !!newDoc.querySelector('.not-home .article-entry h1, .not-home .article-entry h2, .not-home .article-entry h3');
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
          if (isPush) {
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

    // 拦截站内链接（彻底排除图片、灯箱链接和外部锚点）
    $(document).delegate('a', 'click', function(e) {
      var href = $(this).attr('href');
      var target = $(this).attr('target');

      if (!href || href.indexOf('#') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('javascript:') === 0 || target === '_blank') {
        return;
      }
      // 避免拦截图片灯箱及图片数据，防止大纲消失
      if ($(this).hasClass('fancybox') || $(this).attr('data-fancybox') || href.indexOf('data:image') === 0 || href.match(/\.(jpeg|jpg|gif|png|svg|webp|bmp)($|\?)/i)) {
        return;
      }
      if (this.hostname && this.hostname !== window.location.hostname) {
        return;
      }

      e.preventDefault();
      pjaxLoad(this.href, true);
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
