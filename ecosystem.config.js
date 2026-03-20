module.exports = {
  apps: [
    {
      name: 'http-server',
      script: 'node_modules/.bin/http-server',
      args: '-p 5500 -c-1 .'
    },
    {
      name: 'dev-server',
      script: 'server/index.js',
      args: '--dev'
    }
  ]
};
