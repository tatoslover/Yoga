module.exports = function (eleventyConfig) {
  // HTML Minification disabled for now due to issues with < > characters
  // Uncomment below to enable when fixed
  /*
  try {
    const htmlMinifier = require("html-minifier-terser");

    eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
      if (outputPath && outputPath.endsWith(".html")) {
        let minified = htmlMinifier.minify(content, {
          useShortDoctype: true,
          removeComments: true,
          collapseWhitespace: true,
          minifyJS: true,
          minifyCSS: true,
        });
        return minified;
      }
      return content;
    });
  } catch (e) {
    console.warn(
      "HTML Minifier not available - continuing without minification",
    );
  }
  */

  // Copy asset directories to the output
  eleventyConfig.addPassthroughCopy({"src/assets": "assets"});
  eleventyConfig.addPassthroughCopy({"src/css": "css"});
  eleventyConfig.addPassthroughCopy({"src/js": "js"});
  eleventyConfig.addPassthroughCopy({"src/admin": "admin"});

  // Simple duration formatting
  eleventyConfig.addFilter("formatDuration", function (duration) {
    return duration;
  });

  // Current year shortcode
  eleventyConfig.addShortcode("year", function () {
    return new Date().getFullYear();
  });

  // Add slugify filter (built into 11ty)
  eleventyConfig.addFilter("slug", function (str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  });

  // Base configuration
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    passthroughFileCopy: true,
    // Prevent directory structure leaking into output
    pathPrefix: "/",
  };
};
