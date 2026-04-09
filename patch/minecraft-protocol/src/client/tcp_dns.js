const net = require('net')
const dns = require('dns')
const { console } = require('inspector')

module.exports = function (client, options) {
  // Default options
  options.port = options.port || 25565
  options.host = options.host || 'localhost'

  if (!options.connect) {
    options.connect = (client) => {
      // Use stream if provided
      if (options.stream) {
        client.setSocket(options.stream)
        client.emit('connect')
        return
      }
      // use 1.1.1.1 and 8.8.8.8, and local dns servers as fallback, to resolve the domain name
      dns.setServers(['1.1.1.1', ...dns.getServers()])
      // If port was not defined (defauls to 25565), host is not an ip neither localhost
      if (options.port === 25565 && net.isIP(options.host) === 0 && options.host !== 'localhost') {
        // Try to resolve SRV records for the comain
        dns.resolveSrv('_minecraft._tcp.' + options.host, (err, addresses) => {
          // Error resolving domain
          if (err) {
            // Could not resolve SRV lookup, connect directly
            console.log('Error resolving SRV record, directly connecting to ' + options.host + ':' + options.port)
            client.setSocket(net.connect(options.port, options.host))
            return
          }

          // SRV Lookup resolved conrrectly
          if (addresses && addresses.length > 0) {
            options.host = addresses[0].name
            options.port = addresses[0].port
            console.log('SRV record found, connecting to ' + options.host + ':' + options.port)
            client.setSocket(net.connect(addresses[0].port, addresses[0].name))
          } else {
            // Otherwise, just connect using the provided hostname and port
            console.log('No SRV record found, directly connecting to ' + options.host + ':' + options.port)
            client.setSocket(net.connect(options.port, options.host))
          }
        })
      } else {
        // Otherwise, just connect using the provided hostname and port
        client.setSocket(net.connect(options.port, options.host))
      }
    }
  }
}
