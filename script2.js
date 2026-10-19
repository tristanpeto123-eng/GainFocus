(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('./service-worker.js?v=4.0.24', {scope:'./'}).catch(function(err){
        console.warn('Gain Focus service worker registration failed:', err);
      });
    });
  }

  // Load the non-destructive UX polish after the main application logic.
  var ux=document.createElement('script');
  ux.src='./ux-credit-free-patch.js?v=1';
  ux.defer=true;
  document.head.appendChild(ux);

  // Persistent muscle-group splits and touch-friendly weekly workout ordering.
  var split=document.createElement('script');
  split.src='./gain-focus-split-scheduler.js?v=1';
  split.defer=true;
  document.head.appendChild(split);
})();
