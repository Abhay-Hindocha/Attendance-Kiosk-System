module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: ['defaults', 'not IE 11', 'ios >= 12'],
      flexbox: 'no-2009',
      grid: 'autoplace'
    },
  },
}
