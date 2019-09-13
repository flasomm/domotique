# Z-way-PresenceFromMAC

This module manage presence states according to an host MAC address and IP response (mobile phone for example). It use arp-scan
command to verify if the device exists.

# Configuration

## macAddressToScan, ipToScan, scanInterval, scanTimeout

Lets you specify a scan polling intervals, host to scan, ip to filter after scan command, and an initial per host timeout.

# Installation

The prefered way of installing this module is via the "Zwave.me App Store". For stable module releases no access token is required.

Then you must install arp-scan on your system and add arp-scan and grep command to authorized system commands (in ".syscommands" file).

Test the command first in the terminal:

```sh
sudo arp-scan --interface=eth0 -l -g --retry=2 -b 2 -T '<address_mac_to_scan>' | grep <ip_to_filter> | wc -l
```

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
