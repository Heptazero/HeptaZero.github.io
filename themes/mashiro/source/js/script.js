(function($){
  // Caption
  $('.article-entry, .article-inner').each(function(i){
    $(this).find('img').each(function(){
      if ($(this).parent().hasClass('fancybox') || $(this).parent().is('a')) return;

      var alt = this.alt;

      if (alt) $(this).after('<span class="caption">' + alt + '</span>');

      $(this).wrap('<a class="fancybox" href="' + this.src + '" data-fancybox=\"gallery\" data-caption="' + alt + '"></a>')
    });

    $(this).find('.fancybox').each(function(){
      $(this).attr('rel', 'article' + i);
    });
  });

  if ($.fancybox){
    $('.fancybox').fancybox();
  }
  // Mobile nav
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
  }

  var nav = document.getElementById('main-nav-toggle');
  nav.onclick = function(){
    if (isMobileNavAnim) return;

    startMobileNavAnim();
    $container.toggleClass('mobile-nav-on');
    stopMobileNavAnim();
  };

  var wrap = document.getElementById('wrap');
  wrap.onclick = function(){
    if (isMobileNavAnim || !$container.hasClass('mobile-nav-on')) return;

    $container.removeClass('mobile-nav-on');
  };

  // code block copy button
  var codes = document.getElementsByClassName('code');
  for (var i = 0; i < codes.length; ++i) {
    var copy_button = document.createElement('div');
    copy_button.className = "copy-button";
    copy_button.innerHTML = "Copy";
    new ClipboardJS('.copy-button', {
      target: (trigger) => {
        return trigger.nextSibling;
      }
    });
    copy_button.onclick = (e) => {
      var btn = e.target;
      btn.innerHTML = "Copied!";
      setTimeout(function() {
        btn.innerHTML = "Copy";
      }, 1000);
    }
    codes[i].parentElement.insertBefore(copy_button, codes[i]);
  }


  // TOC scroll spy
  $(window).scroll(function(){
    var scrollTop = $(window).scrollTop();
    var tocLinks = $('.toc-link');
    var headers = [];

    // Find all headers
    tocLinks.each(function(){
      var href = $(this).attr('href');
      var header = $(decodeURIComponent(href)); // Decode URI component for Chinese headers
      if (header.length) {
        headers.push({
          link: $(this),
          header: header,
          top: header.offset().top
        });
      }
    });

    // Find active header
    var activeLink = null;
    for (var i = 0; i < headers.length; i++) {
      if (scrollTop >= headers[i].top - 150) { // 150px offset
        activeLink = headers[i].link;
      } else {
        break;
      }
    }

    // Update class
    $('.toc-link').removeClass('active');
    if (activeLink) {
      activeLink.addClass('active');
      activeLink.parents('.toc-child').prev('.toc-link').addClass('active'); // Highlight parent too
    }
  });

})(jQuery);