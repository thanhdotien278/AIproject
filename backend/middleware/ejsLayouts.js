/**
 * EJS Layouts Middleware
 * This middleware injects the rendered view into the layout specified
 */

module.exports = function() {
  return function(req, res, next) {
    // Store the original render method
    const originalRender = res.render;
    
    // Override the render method
    res.render = function(view, options, callback) {
      // Default options object
      options = options || {};
      
      // Render the view
      originalRender.call(this, view, options, function(err, html) {
        if (err) return callback ? callback(err) : next(err);
        
        // If this is a layout or explicitly set to no layout, don't process further
        if (view.includes('layouts/') || options.layout === false) {
          return callback ? callback(null, html) : res.send(html);
        }
        
        // Add the rendered view to options as 'body'
        options.body = html;
        
        // Determine which layout to use
        let layoutFile = 'layouts/main';
        
        if (options.layout) {
          layoutFile = typeof options.layout === 'string' ? options.layout : layoutFile;
        }
        
        // Render with the layout
        originalRender.call(res, layoutFile, options, callback || function(err, html) {
          if (err) return next(err);
          res.send(html);
        });
      });
    };
    
    next();
  };
}; 