(function(){
  var s = '';
  for (var i = 1; i <= 12; i++) s += '<figure class="thumb wide douzi-scene"><img src="assets/douzi-archives/scene-' + i + '.jpg"><figcaption>Scène ' + i + '</figcaption></figure>';
  window.PORKO_DOUZI_EPIC = { title: 'Sofiane Douzi', sub: 'Épopée', lead: 'Refonte', image: 'assets/douzi-archives/portrait.jpg', html: '<p>Épopée.</p>' + s };
})();
