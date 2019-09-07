/*** Presence From Mac Z-Way module *******************************************

 Version: 1.0
 (c) Fabrice Sommavilla, 2019
 -----------------------------------------------------------------------------
 Author: Fabrice Sommavilla
 Description:
 Module to set presence switch according to mac address response (of mobile phone for example).

 ******************************************************************************/

function PresenceFromMac(id, controller) {
    // Call superconstructor first (AutomationModule)
    PresenceFromMac.super_.call(this, id, controller);

    this.deviceId = '';
}

inherits(PresenceFromMac, BaseModule);

_module = PresenceFromMac;


// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

PresenceFromMac.prototype.init = function (config) {
    PresenceFromMac.super_.prototype.init.call(this, config);

    this.deviceId = 'Presence_From_Mac_' + this.config.device + '_' + this.id;
    var self = this;
    self.log('Initializing DeviceId ' + this.deviceId);
    self.controller.devices.create({
        deviceId: this.deviceId,
        defaults: {
            metrics: {
                title: self.getInstanceTitle()
            }
        },
        overlay: {
            deviceType: this.config.device,
            metrics: {
                icon: self.config.iconSensor,
                level: 'off',
                scaleTitle: ''
            },
            handler: function (command, args) {
                self.log('#####================>>>>> init ARGS ' + command + ' ' + args);
            },
            moduleId: this.id
        }
    });

    // add cron schedule every self.config['pingInterval'] minutes
    this.controller.emit('cron.addTask', 'presenceFromMac.poll', {
        minute: [0, 59, self.config['scanInterval']],
        hour: null,
        weekDay: null,
        day: null,
        month: null
    });

    self.scanResult = 0;

    this.controller.on('presenceFromMac.poll', function () {
        var code = system('sudo arp-scan --interface=eth0 -l -g --retry=2 -b ' + self.config['scanTimeout'] +
            ' -T ' + self.config['macAddressToScan'] +
            ' | grep ' + self.config['ipToScan'] + ' | wc -l');

        if (code !== null && code[0] > 0) {
            self.scanResult = 1;
            self.isPresent();
        }
    });
};

PresenceFromMac.prototype.stop = function () {
    if (this.timer) {
        clearInterval(this.timer);
    }

    this.controller.emit('cron.removeTask', 'presenceFromMac.poll');
    this.controller.devices.remove(this.deviceId);

    PresenceFromMac.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

PresenceFromMac.prototype.isPresent = function () {
    var self = this;
    var vDev = this.controller.devices.get(this.deviceId);

    if (vDev) {
        var actualStatus = vDev.get('metrics:level');

        if (self.scanResult > 0) {
            actualStatus = 'on';
        }

        self.log('Set presence to ' + actualStatus);
        vDev.set('metrics:level', actualStatus);
        vDev.set('metrics:icon', self.imagePath + '/' + 'presence_' + actualStatus + '.png');

    } else {
        self.log('PresenceFromMac can\'t find ' + self.config.device + ' device');
    }
};

