/*** Ping Presence Z-Way module *******************************************

 Version: 1.0
 (c) Gwenhaël Le Normand, 2016
 -----------------------------------------------------------------------------
 Author: Gwenhaël Le Normand
 Description:
 Module to set presence switch according to ip ping response (of mobile phone for example).

 ******************************************************************************/

function PingPresence(id, controller) {
    // Call superconstructor first (AutomationModule)
    PingPresence.super_.call(this, id, controller);
}

inherits(PingPresence, BaseModule);

_module = PingPresence;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

PingPresence.prototype.init = function (config) {
    PingPresence.super_.prototype.init.call(this, config);

    var self = this;

    // add cron schedule every self.config['pingInterval'] minutes
    this.controller.emit("cron.addTask", "pingPresence.poll", {
        minute: [0, 59, self.config['pingInterval']],
        hour: null,
        weekDay: null,
        day: null,
        month: null
    });

    self.last3PingResult = [0, 0, 0];

    controller.on('pingPresence.poll', function () {
        code = system('ping -c 1 -w ' + self.config['pingTimeout'] + ' ' + self.config['ipToPing'] + ' | grep -c \'1 received\'');
        if (code != null) {
            if (code[0] != null) {
                //rotate in the table
                self.last3PingResult[2] = self.last3PingResult[1];
                self.last3PingResult[1] = self.last3PingResult[0];

                //add the last one in the table
                self.last3PingResult[0] = code[0];

                self.checkPresence();
            }
        }
    });
};

PingPresence.prototype.stop = function () {
    this.controller.emit("cron.removeTask", "pingPresence.poll");
    PingPresence.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
PingPresence.prototype.checkPresence = function () {
    var self = this;
    var vDev = controller.devices.get(this.config.device);

    if (vDev) {
        var newStatus = 'off';
        var Presence = self.last3PingResult[0] + self.last3PingResult[1] + self.last3PingResult[2];

        //if at least one ping is ok presence is set to 'on' otherwise presence is set to 'off'
        if (Presence != 768) //256 * 3
        {
            newStatus = 'on';
        }

        var actualStatus = vDev.get('metrics:level');

        if (actualStatus != newStatus) {
            vDev.performCommand(newStatus);
        }
    }
    else {
        self.debug("PingPresence can\'t find " + self.config.device + " device");
    }
};
