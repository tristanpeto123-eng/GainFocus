
(function(){
  if(!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./service-worker.js?v=4.0.24', {scope:'./'}).catch(function(err){
      console.warn('Gain Focus service worker registration failed:', err);
    });
  });
})();
