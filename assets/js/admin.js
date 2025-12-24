(function($){
  function setStatus($el, ok, msg){
    $el.text(msg || (ok ? 'OK' : 'Error'));
    $el.css('color', ok ? '#0f766e' : '#b91c1c');
  }

  $(document).on('click', '#ss-test-connection', function(){
    const $out = $('#ss-test-result');
    setStatus($out, true, 'Testing...');
    $.post(SawahSportsAdmin.ajaxUrl, {
      action: 'sawah_sports_test_connection',
      nonce: SawahSportsAdmin.nonce
    }).done(function(r){
      if(r && r.success){ setStatus($out, true, 'Connected'); }
      else { setStatus($out, false, (r && r.data && r.data.message) ? r.data.message : 'Failed'); }
    }).fail(function(xhr){
      setStatus($out, false, 'Failed');
    });
  });

  $(document).on('click', '#ss-clear-cache', function(){
    const $out = $('#ss-clear-result');
    setStatus($out, true, 'Clearing...');
    $.post(SawahSportsAdmin.ajaxUrl, {
      action: 'sawah_sports_clear_cache',
      nonce: SawahSportsAdmin.nonce
    }).done(function(r){
      if(r && r.success){ setStatus($out, true, 'Cleared'); }
      else { setStatus($out, false, 'Failed'); }
    }).fail(function(){
      setStatus($out, false, 'Failed');
    });
  });
})(jQuery);
