module.exports = {
    port: 8181,
    rewrite: [
        {
            from: '/resources/(.*)',
            to: 'http://remote-api.org:8080/resources/$1'
        }
    ],
    directory: './'
}