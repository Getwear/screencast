$(function () {
  var $stage = $('#screencast-stage'),
      $fotorama = $('#screencast-fotorama'),
      fotorama,
      currentScreencast,
      screencastIsPlaying,
      screencastIsEnded,
      lastActiveFrame,
      $splash = $('.splash', $stage),
      $play = $('#screencast-play'),
      $replay = $('#screencast-replay'),
      $navLinks = $('.switch', '#screencast-nav');

  $fotorama
      .on('fotorama:show', function (e, fotorama) {
        $('.screencast-paused', $fotorama).removeClass('screencast-paused');

        // Выделяем активную ссылоку под скринкастом
        $navLinks
            .removeClass('switch_selected')
            .filter('[data-section="' + fotorama.activeFrame.section + '"]')
            .addClass('switch_selected');
      })
      .on('fotorama:showend', function (e, fotorama, extra) {
        var activeFrame = fotorama.activeFrame,
            $frame = activeFrame.$stageFrame;

        if (!$frame.data('state')) {
          $frame.on('f:load f:error', function () {
            fotorama.activeFrame.$stageFrame === $frame && catchFrame(activeFrame, $frame);
          });
        } else {
          catchFrame(activeFrame, $frame);
        }
      });

  function catchFrame (activeFrame, $frame) {
    /*if (lastActiveFrame === activeFrame) {
      return;
    }*/

    if (currentScreencast) {
      // Останавливаем текущий кусочек скринкаста
      currentScreencast.stop();
    }

    var screencast = $('.screencast', $frame)
        .screencast()
        .data('screencast');

    if (screencast) {
      // Запускаем новый кусочек
      // Глобальны window.currentScreencast временно, для управления из консоли (currentScreencast.start())
      window.currentScreencast = currentScreencast = screencast;
      screencast.start();
      screencastIsPlaying = true;
    }

    //lastActiveFrame = activeFrame;
  }

  function fotoramaTurnOn () {
    fotorama = $fotorama
        .stop()
        .fadeIn('fast')
        .fotorama({
          width: $stage.width(),
          height: $stage.height(),
          nav: false,
          transition: 'dissolve',
          trackpad: false,
          arrows: false,
          click: false,
          swipe: false,
          fit: 'none'
        })
        .data('fotorama');
  }

  window.fotoramaGoTo = function fotoramaGoTo (id) {
    if (!fotorama) {
      // Если фоторама ещё не инициирована, включаем её
      fotoramaTurnOn();
    }

    if (screencastIsEnded) {
      screencastIsEnded = false;

      $replay.stop().fadeOut('fast', function () {
        $replay.hide();
      });
    }

    fotorama.show({index: id});
  };

  function onFotoramaClick () {
    if (currentScreencast) {
      // Пауза
      currentScreencast[screencastIsPlaying ? 'pause' : 'resume']();
      screencastIsPlaying = !screencastIsPlaying;
    }
  }

  $fotorama.touchClick(onFotoramaClick);

  function onSplashClick () {
    // Заводим фотораму
    fotoramaGoTo('home');
  }

  $splash.touchClick(onSplashClick);

  function onNavClick () {
    var $this = $(this);
    fotoramaGoTo($this.data('section'));
  }

  $navLinks.touchClick(onNavClick);

  $(document).on('complete', '.screencast', function () {
    // Слушаем события о завершении анимации скринкаста
    if (fotorama) {
      if (fotorama.activeIndex < fotorama.size - 1) {
        // Включаем следующий кадр
        fotorama.show('>');
      } else {
        // Останавливаем всё
        $replay.fadeIn('fast');
        screencastIsPlaying = false;
        screencastIsEnded = true;
        $stage.removeClass('stage__played');
      }
    }
  });
});