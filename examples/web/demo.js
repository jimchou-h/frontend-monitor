(function () {
  var trackerId = localStorage.getItem('fm_demo_tracker');
  if (!trackerId) {
    trackerId = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('fm_demo_tracker', trackerId);
  }

  fetch('/api/public/demo-config')
    .then(function (res) { return res.json(); })
    .then(function (body) {
      if (!body.data) throw new Error('服务端还没有项目，请先执行 pnpm seed');
      FrontendMonitor.init({
        dsn: '/errors/upload',
        trackDsn: '/tracks/upload',
        apikey: body.data.apikey,
        trackKey: body.data.trackKey,
        backTrackerId: function () { return trackerId; },
        debug: true,
        release: '1.0.0',
        maxBreadcrumbs: 30,
      });
      bindEvents();
      window.__demoReady = true;
    })
    .catch(function (err) {
      document.getElementById('output').textContent = '初始化失败: ' + err.message;
    });

  function bindEvents() {
    var output = document.getElementById('output');
    var log = function (text) { output.textContent = text; };

    document.getElementById('js-error').addEventListener('click', function () {
      log('已触发 TypeError');
      var list = undefined;
      list.length.toString();
    });

    document.getElementById('promise-reject').addEventListener('click', function () {
      log('已触发 unhandledrejection');
      Promise.reject(new Error('订单接口返回数据异常'));
    });

    document.getElementById('resource-error').addEventListener('click', function () {
      log('已触发资源加载失败');
      var img = document.createElement('img');
      img.src = '/assets/not-exists.png?t=' + Date.now();
      document.body.appendChild(img);
    });

    document.getElementById('http-error').addEventListener('click', function () {
      log('已触发 HTTP 500 请求');
      fetch('/api/not-exists?t=' + Date.now()).catch(function () {});
    });

    document.getElementById('track-pay').addEventListener('click', function () {
      log('已上报 pay_click');
      FrontendMonitor.track({
        actionType: 'EVENT',
        trackId: 'pay_click',
        custom: { amount: 99.9, currency: 'CNY' },
      });
    });

    document.getElementById('track-page').addEventListener('click', function () {
      log('已上报 page_view');
      FrontendMonitor.track({ actionType: 'PAGE', trackId: 'page_view', custom: { page: location.pathname } });
    });

    document.getElementById('track-duration').addEventListener('click', function () {
      log('已上报 checkout_duration，等待 1.2 秒');
      var start = Date.now();
      setTimeout(function () {
        FrontendMonitor.track({
          actionType: 'DURATION',
          trackId: 'checkout_duration',
          value: Date.now() - start,
        });
      }, 1200);
    });
  }
})();
