// sits in front of the router and provides 'currentPage' and 'nextPage',
// whilst setting the correct classes on the body to allow transitions, namely:
//
//   body.transitioning.from_X.to_Y

(function() {
  var Transitioner = function() {
    this._currentPage = null;
    this._currentPageListeners = new Meteor.deps._ContextSet();
    this._nextPage = null;
    this._nextPageListeners = new Meteor.deps._ContextSet();
    this._options = {
      before: function(){},
      after: function(){},
      redrawAfterTransition: true
    };
  }
  Transitioner.prototype._transitionEvents = 'webkitTransitionEnd.transitioner oTransitionEnd.transitioner transitionEnd.transitioner msTransitionEnd.transitioner transitionend.transitioner';
  
  Transitioner.prototype._transitionClasses = function() {
    return "transitioning from_" + this._currentPage + 
      " to_" + this._nextPage;
  }
  
  Transitioner.prototype.setOptions = function(options) {
    for (var key in options){
      if (options.hasOwnProperty(key)){
        this._options[key] = options[key];
      }
    }
  }
  
  Transitioner.prototype.currentPage = function() {
    this._currentPageListeners.addCurrentContext();
    return this._currentPage;
  }
  
  Transitioner.prototype._setCurrentPage = function(page, redraw) {
    this._currentPage = page;
    if (this._options.redrawAfterTransition || redraw)
      this._currentPageListeners.invalidateAll();
  }
  
  Transitioner.prototype.nextPage = function() {
    this._nextPageListeners.addCurrentContext();
    return this._nextPage;
  }
  
  Transitioner.prototype._setNextPage = function(page, redraw) {
    this._nextPage = page;
    if (this._options.redrawAfterTransition || redraw)
      this._nextPageListeners.invalidateAll();
  }
  
  Transitioner.prototype.listen = function() {
    var self = this;
    
    Meteor.autorun(function() {
      self.transition(Meteor.Router.page());
    });
  }
  
  // do a transition to newPage, if we are already set and there already
  //
  // note: this is called inside an autorun, so we need to take care to not 
  // do anything reactive.
  Transitioner.prototype.transition = function(newPage) {
    var self = this;
    
    // this is our first page? don't do a transition
    if (!self._currentPage)
      return self._setCurrentPage(newPage, true);
    
    // if we are transitioning already, quickly finish that transition
    if (self._nextPage)
      self.endTransition();
    
    // if we are transitioning to the page we are already on, no-op
    if (self._currentPage === newPage)
      return;
    
    // Start the transition -- first tell any listeners to re-draw themselves
    self._setNextPage(newPage, true);
    // wait until they are done/doing:
    Meteor._atFlush(function() {
      
      if(self._options.before){
        self._options.before();
      }
      
      // add relevant classes to the body and wait for the body to finish 
      // transitioning (this is how we know the transition is done)
      $('body')
        .addClass(self._transitionClasses())
        .on(self._transitionEvents, function (e) {
          if ($(e.target).is('body'))
            self.endTransition();
        });
    })
  }
  
  Transitioner.prototype.endTransition = function() {
    var self = this;
    
    // if nextPage isn't set, something weird is going on, bail
    if (! self._nextPage)
      return;
    
    // switch
    self._setCurrentPage(self._nextPage, false);
    self._setNextPage(null, false);
    
    // clean up our transitioning state
    Meteor._atFlush(function() {
      var classes = self._transitionClasses();
      $('body').off('.transitioner').removeClass(classes);
      
      if(self._options.after){
        self._options.after();
      }
    });
  }
  
  Meteor.Transitioner = new Transitioner();
  Meteor.startup(function() {
    Meteor.Transitioner.listen();
  });
}());
