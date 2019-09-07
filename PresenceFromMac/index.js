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

    this.deviceId = "";
}

inherits(PresenceFromMac, BaseModule);

_module = PresenceFromMac;


// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

PresenceFromMac.prototype.init = function (config) {
    PresenceFromMac.super_.prototype.init.call(this, config);

    this.deviceId = "Presence_From_Mac_" + this.config.device + "_" + this.id;
    var self = this;
    self.log('================>>>>> init DEVICE ID ' + this.deviceId);
    var vDev = self.controller.devices.create({
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
                self.log('================>>>>> init ARGS ' + args);
                if (command === 'update' && this.config.device === 'sensorBinary') {
                    self.update(this);
                }
            },
            moduleId: this.id
        }
    });

    if (vDev && this.config['getter_sensor'] && this.config['getterPollInterval']) {
        this.timer = setInterval(function () {
            self.update(vDev);
        }, this.config['getterPollInterval'] * 1000);
    }

    // add cron schedule every self.config['pingInterval'] minutes
    this.controller.emit('cron.addTask', 'presenceFromMac.poll', {
        minute: [0, 59, self.config['scanInterval']],
        hour: null,
        weekDay: null,
        day: null,
        month: null
    });

    self.last3ScanResult = [0, 0, 0];

    this.controller.on('presenceFromMac.poll', function () {
        var code = system("sudo arp-scan --interface=eth0 -l -g --retry=2 -b " + self.config['scanTimeout'] +
            " -T " + self.config['macAddressToScan'] +
            " | grep " + self.config['ipToScan'] + " | wc -l");
        if (code != null && code[0] != null) {
            //rotate in the table
            self.last3ScanResult[2] = self.last3ScanResult[1];
            self.last3ScanResult[1] = self.last3ScanResult[0];

            //add the last one in the table
            self.last3ScanResult[0] = code[0];

            self.log('================>>>>> init last3ScanResult ' + self.last3ScanResult);

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

    self.log('================>>>>> stop DEVICE ID ' + this.deviceId);

    PresenceFromMac.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

PresenceFromMac.prototype.update = function (vDev) {
    var getterCode = this.config["getter_" + this.config.device];

    if (getterCode) {
        var newValue = eval(getterCode);
        vDev.set("metrics:level", newValue);
    }
};

/*
 PresenceFromMac.prototype.act = function (vDev, action, subst, selfValue) {
 var setterCode = this.config[`setter${action}_${this.config.device}`];

 if (!!setterCode) {
 if (subst != null) {
 setterCode = setterCode.replace(/%%/g, subst);
 }
 eval(setterCode);
 }

 if ((!setterCode || this.config.updateOnAction === true) && selfValue !== null) {
 vDev.set("metrics:level", selfValue);
 }
 };
 */

PresenceFromMac.prototype.isPresent = function () {
    var self = this;
    var vDev = this.controller.devices.get(this.deviceId);

    if (vDev) {
        var newStatus = 'off';
        var presence = self.last3ScanResult[0] + self.last3ScanResult[1] + self.last3ScanResult[2];
        self.log('================>>>>> PRESENCE ' + presence);

        // if at least one scan is ok presence is set to 'on' otherwise presence is set to 'off'
        if (presence != 768) //256 * 3
        {
            newStatus = 'on';
        }

        var actualStatus = vDev.get('metrics:level');

        self.log('================>>>>> ACTUAL STATUS ' + actualStatus);

        if (actualStatus != newStatus) {
            vDev.performCommand(newStatus);
            self.log('================>>>>> Setting new mode to ' + newStatus + ' (was ' + actualStatus + ')');
        }
    }
    else {
        self.log("================>>>>> PresenceFromMac can't find " + self.config.device + " device");
    }
};

